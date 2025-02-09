#version 100


#ifdef GL_ES
    precision highp float;
#endif

uniform vec2 resolution;
uniform vec3 pixel00;
uniform vec3 pixelU;
uniform vec3 pixelV;
uniform vec3 cameraCenter;

const int samples = 5;
const int maxBounces = 2;
const int spheresAmount = 5;

const float sampleWeight = 1.0 / float(samples);
const float infinity = pow(2.0, 32.0) - 1.0;
const float pi = 3.14159265359;

const float gamma = 1.1;

struct Material {
    int type; // 0 = Lambertian, 1 = Metal, 2 = Dielectric
    vec3 albedo;
    float fuzz;
    float refractionIndex;
};

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct HitRecord {
    vec3 point;
    vec3 normal;
    bool frontFace;
    float t;
    bool hit;
    vec3 color;
    Material mat;
};




float random(vec2 state) {
    return fract(sin(dot(state.xy ,vec2(12.9898, 78.233))) * 43758.5453);
}


vec3 randomVector(vec2 seed) {
    float z = random(seed) * 2.0 - 1.0; // Random value between -1 and 1
    float t = random(seed + 1.0) * 2.0 * pi; // Random angle
    float r = sqrt(1.0 - z * z);
    return normalize(vec3(r * cos(t), r * sin(t), z));
}


void hitSphere(Ray ray, inout HitRecord record, vec3 center, float radius, float tmin, float tmax, Material testMaterial) {
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
    record.mat = testMaterial;
    record.frontFace = true;
    //If ray is coming from inside sphere, flip the normal
    if (dot(ray.direction, record.normal) > 0.0) {
        record.normal = -record.normal;
        record.frontFace = false;
    }
}

vec3 background(vec3 direction, vec3 sunDirection, vec3 sunColor, float sunSize) {
    vec3 unitDirection = normalize(direction);
    float t = 0.5*(unitDirection.y + 1.0);
    vec3 baseColor = vec3(1.0-t) + t*vec3(0.4, 0.6, 1.0);

    float angle = acos(dot(unitDirection, normalize(sunDirection)));
    float sunEffect = exp(-pow(angle / sunSize, 0.8));
    vec3 finalColor = mix(baseColor, sunColor, sunEffect);

    return finalColor;
}

float reflectance(float cosine, float refractionIndex) {

    float r0 = (1.0 - refractionIndex) / (1.0 + refractionIndex);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}



void lambertian(inout Ray ray, inout HitRecord record, vec2 seed) {
    ray.direction = record.normal + randomVector(seed + record.t);
    //If normal and randomVector are opposite, the vector will be zero and will result in weird behavior
    if (length(ray.direction) < 0.0001) {
        ray.direction = record.normal;
    }

    record.color *= record.mat.albedo;
}

void metal(inout Ray ray, inout HitRecord record, vec2 seed) {
    ray.direction = ray.direction - 2.0 * dot(ray.direction, record.normal) * record.normal + record.mat.fuzz * randomVector(seed);
    record.color *= record.mat.albedo;
}


void dialetric(inout Ray ray, inout HitRecord record, vec2 seed) {
    float ri = record.frontFace ? (1.0 / record.mat.refractionIndex) : record.mat.refractionIndex;
    vec3 unitDirection = normalize(ray.direction);

    float cosTheta = min(dot(-unitDirection, record.normal), 1.0);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

    bool cannotRefract = ri * sinTheta > 1.0;

    if (cannotRefract || reflectance(cosTheta, ri) > random(seed)) {
        metal(ray, record, seed);
        return;
    }

    //Refract
    vec3 rOutPerp = ri * (unitDirection + cosTheta * record.normal);
    vec3 rOutParallel = -sqrt(abs(1.0 - length(rOutPerp) * length(rOutPerp)))  * record.normal;
    vec3 refracted = rOutPerp + rOutParallel;

    record.color *= record.mat.albedo;
    ray.direction = refracted;

    
}

void rayHit(inout Ray ray, inout HitRecord record, vec2 seed) {
    ray.origin += record.t * ray.direction;

    if (record.mat.type == 0) {
        lambertian(ray, record, seed);
        return;
    }
    
    if (record.mat.type == 1) {
        metal(ray, record, seed);
        return;
    }

    if (record.mat.type == 2) {
        dialetric(ray, record, seed);
        return;
    }
}

vec3 rayColor(Ray ray, HitRecord record, float tmin, float tmax, vec2 seed) {
    vec4 spheres[spheresAmount];
    Material materials[spheresAmount];

    spheres[0] = vec4(0.0, -100.5, -1.0, 100);
    materials[0] = Material(0, vec3(0.8, 0.8, 0.0), 0.0, 1.0);
    
    spheres[1] = vec4(0.0, 0.0, -1.2, 0.5);
    materials[1] = Material(0, vec3(0.1, 0.2, 0.5), 0.0, 1.0);

    spheres[2] = vec4(-1.0, 0.0, -1.0, 0.5);
    materials[2] = Material(2, vec3(1.0, 1.0, 1.0), 0.0, 1.5);
    
    spheres[3] = vec4(-1.0, 0.0, -1.0, 0.4);
    materials[3] = Material(2, vec3(1.0, 1.0, 1.0), 0.0, 1.0/1.5);
    
    spheres[4] = vec4(1.0, 0.2, -1.0, 0.5);
    materials[4] = Material(1, vec3(0.8, 0.6, 0.2), 1.0, 1.0);

   
    
    for (int j = 0; j <= maxBounces; j++) {
        record.hit = false;
        record.t = tmax;

        //Loop through each sphere in the world
        for(int i = 0; i < spheresAmount; i++) {
            
            //Test if the ray interesects any spheres closer than the current record
            hitSphere(ray, record, spheres[i].xyz, spheres[i].w, tmin, record.t, materials[i]);
        }


        if (record.hit) {
            rayHit(ray, record, seed);
        } else {

            vec3 background = background(ray.direction, vec3(1.0, 0.6, 0.5), vec3(5.0, 5.0, 4.0), 0.05 );
            record.color *= background;
            return record.color;
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

    //Gamma correction
    color = pow(color, vec3(1.0 / gamma));

    gl_FragColor = vec4(color, 1.0);
}