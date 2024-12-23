#version 100


#ifdef GL_ES
    precision highp float;
#endif

uniform vec2 resolution;
uniform vec3 pixel00;
uniform vec3 pixelU;
uniform vec3 pixelV;
uniform vec3 cameraCenter;


const int samples = 20;
const int maxBounces = 3;

const float sampleWeight = 1.0 / float(samples);
const float infinity = pow(2.0, 32.0) - 1.0;
const float pi = 3.1415926535897932384626433832795;

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct HitRecord {
    vec3 point;
    vec3 normal;
    float t;
    bool hit;
    vec3 color;
};

const int spheresAmount = 4;



float random(vec2 state) {
    return fract(sin(dot(state.xy ,vec2(12.9898, 78.233))) * 43758.5453);
}


vec3 randomVector(vec2 seed) {
    float z = random(seed) * 2.0 - 1.0; // Random value between -1 and 1
    float t = random(seed + 1.0) * 2.0 * pi; // Random angle
    float r = sqrt(1.0 - z * z);
    return normalize(vec3(r * cos(t), r * sin(t), z));
}


void hitSphere(Ray ray, inout HitRecord record, vec3 center, float radius, float tmin, float tmax) {
    //Calculate initial variables
    vec3 oc = center - ray.origin;
    float a = dot(ray.direction, ray.direction);
    float h = dot(ray.direction, oc);
    float c = dot(oc, oc) - radius*radius;
    float discriminant = h*h - a*c;

    if (discriminant < 0.0) {
        return;
    }

    //Find the nearest root   
    float sqrtd = sqrt(discriminant);
    float root = (h - sqrtd) / a;
    if (root <= tmin || root >= tmax) {
        root = (h + sqrtd) / a;
        if (root <= tmin || root >= tmax) {
            return;
        }
    }

    record.hit = true;
    record.t = root;
    record.point = ray.origin + root * ray.direction;
    record.normal = (record.point - center) / radius;
    //If ray is coming from inside sphere, flip the normal
    if (dot(ray.direction, record.normal) > 0.0) {
        record.normal = -record.normal;
    }
}

vec3 background(vec3 direction, vec3 sunDirection, vec3 sunColor, float sunSize) {
    vec3 unitDirection = normalize(direction);
    float t = 0.5*(unitDirection.y + 1.0);
    vec3 baseColor = vec3(1.0-t) + t*vec3(0.4, 0.6, 1.0);

    float angle = acos(dot(unitDirection, normalize(sunDirection)));
    float sunEffect = exp(-pow(angle / sunSize, 2.0));
    vec3 finalColor = mix(baseColor, sunColor, sunEffect);

    return finalColor;
}

vec3 rayColor(Ray ray, HitRecord record, float tmin, float tmax, vec2 seed) {
    vec4 spheres[spheresAmount];
    spheres[0] = vec4(0.0, 0.0, 0.0, 0.5);
    spheres[1] = vec4(0.0, -100.5, 0.0, 100.0);
    spheres[2] = vec4(0.7, 0.2, 0.2, 0.15);
    spheres[3] = vec4(0.6, -0.2, 0.4, 0.2);

    for(int j = 0; j <= maxBounces; j++) {
        record.hit = false;
        record.t = tmax;

        //Loop through each sphere in the world
        for(int i = 0; i < spheresAmount; i++) {
            
            //Test if the ray interesects any spheres closer than the current record
            hitSphere(ray, record, spheres[i].xyz, spheres[i].w, tmin, record.t);
        }


        if (record.hit) {
            ray.origin += record.t * ray.direction;

            //Diffuse Material
            // ray.direction = record.normal + randomVector(seed + record.color.xy);
            // record.color *= 0.5;

            //Mirror
            ray.direction = ray.direction - 2.0 * dot(ray.direction, record.normal) * record.normal;
            record.color *= 0.95;
        } else {
            vec3 background = background(ray.direction, vec3(0.2, 0.6, 1.0), vec3(1.0, 1.0, 0.8), 0.15 );
            return record.color * background;
        }
    }

    record.color = vec3(0.0);
    return record.color;
}   


void main() {
    vec3 color = vec3(0.0);
    vec2 st = gl_FragCoord.xy;
    vec3 pixelCenter = pixel00 + (st.x * pixelU) + (st.y * pixelV);

    for (int sample = 0; sample < samples; sample++) {
        vec2 seed = st / resolution + vec2(sample);

        Ray ray;
        ray.origin = cameraCenter;
        ray.direction = pixelCenter - cameraCenter;

        HitRecord record;
        record.color = vec3(1.0);

        color += sampleWeight * rayColor(ray, record, 0.001, infinity, seed);
    }

    gl_FragColor = vec4(color, 1.0);
}