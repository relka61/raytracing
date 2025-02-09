// GPU shader
let raytracer;

// Camera
let cam;
let imageWidth = 1920;
let aspectRatio = 16/9;

let verticalFOV = 90;
let lookFrom;
let lookDirection;
let viewUp;

// Movement
var mouseLocked = false;
var speed = 0.05;
var sensitivity = 0.01;


function preload() {
  raytracer = loadShader('shaders/shader.vert', 'shaders/shader.frag');
}

function setup() {

  // Camera
  lookFrom = createVector(0.0, 0.0, 0.0);
  lookDirection = createVector(0.0, 0.0, -1.0);
  viewUp = createVector(0.0, 1.0, 0.0);
  cam = new Camera(aspectRatio, imageWidth, lookFrom, lookDirection, viewUp);


  // Create the canvas
  pixelDensity(1);
  createCanvas(imageWidth, cam.imageHeight, WEBGL);
  noStroke();
}

function draw() {
  // Update the camera
  cam.move();

  // Update the shader uniforms
  raytracer.setUniform("resolution", [width, height]);
  raytracer.setUniform("pixel00", [cam.pixel00.x, cam.pixel00.y, cam.pixel00.z]);
  raytracer.setUniform("pixelU", [cam.pixelU.x, cam.pixelU.y, cam.pixelU.z]);
  raytracer.setUniform("pixelV", [cam.pixelV.x, cam.pixelV.y, cam.pixelV.z]);
  raytracer.setUniform("cameraCenter", [cam.lookFrom.x, cam.lookFrom.y, cam.lookFrom.z]);
  
  // Run the shader
  shader(raytracer);
  rect(0, 0, width, height);
}





function mouseClicked() {
  if (mouseLocked) {
    exitPointerLock();
    mouseLocked = false;
  } else {
    requestPointerLock();
    mouseLocked = true;
  }
}

function mouseWheel(event) {
  if (mouseLocked) {
    cam.verticalFOV += event.delta * 0.1;
  }
}


class Camera {
  constructor(aspectRatio, imageWidth, lookFrom, lookDirection, viewUp, verticalFOV = 90, defocusAngle = 0, focusDisk = 10) {
    // Set variables
    this.lookFrom = lookFrom;
    this.lookDirection = lookDirection;
    this.viewUp = viewUp;

    this.verticalFOV = verticalFOV;
    this.defocusAngle = defocusAngle;
    this.focusDisk = focusDisk;

    // Calculate the image dimensions
    this.imageWidth = imageWidth;
    this.imageHeight = max(1, int(imageWidth / aspectRatio));

    this.update();
  }

  move() {
    if (mouseLocked) {
      this.keys();
      this.mouse();
      this.update();
    }
  }

  mouse() {
    this.lookDirection = rotateAround(this.lookDirection, this.v, movedX * -sensitivity);
    this.lookDirection = rotateAround(this.lookDirection, this.u, movedY * -sensitivity);
  }

  keys() {
    let leftRight = p5.Vector.cross(this.viewUp, this.w).normalize();
    let frontBack = this.w.copy().mult(-1);
    let upDown = this.viewUp.copy();

    if (keyIsDown(65) || keyIsDown(97)) { // 'A' or 'a'
      this.lookFrom.sub(leftRight.mult(speed));
    }
  
    if (keyIsDown(68) || keyIsDown(100)) { // 'D' or 'd'
      this.lookFrom.add(leftRight.mult(speed));
    }
  
    if (keyIsDown(87) || keyIsDown(119)) { // 'W' or 'w'
      this.lookFrom.add(frontBack.mult(speed));
    }
  
    if (keyIsDown(83) || keyIsDown(115)) { // 'S' or 's'
      this.lookFrom.sub(frontBack.mult(speed));
    }

    if (keyIsDown(69) || keyIsDown(101)) { // 'E' or 'e'
      this.lookFrom.add(upDown.mult(speed));
    }

    if (keyIsDown(81) || keyIsDown(113)) { // 'Q' or 'q'
      this.lookFrom.sub(upDown.mult(speed));
    }
  }

  update() {
    this.lookAt = p5.Vector.add(this.lookFrom, this.lookDirection);

    //Determine viewport dimensions
    let theta = this.verticalFOV * PI / 180;
    let h = tan(theta / 2);
    this.viewportHeight = 2.0 * h * this.focusDisk;
    this.viewportWidth = this.viewportHeight * (this.imageWidth / this.imageHeight);

    // Calculate u, v, w basis vectors
    this.w = p5.Vector.sub(this.lookFrom, this.lookAt).normalize();
    this.u = p5.Vector.cross(this.viewUp, this.w).normalize();
    this.v = p5.Vector.cross(this.w, this.u).normalize();

    // If Outer Wilds controls are desired, uncomment next line
    // this.viewUp = this.v;

    // Calculate vectors along horizontal and vertical viewport edges
    this.viewportU = this.u.copy().mult(this.viewportWidth);
    this.viewportV = this.v.copy().mult(this.viewportHeight);

    // Calculate the horizontal and vertical delta vectors between pixels
    this.pixelU = this.viewportU.copy().div(this.imageWidth);
    this.pixelV = this.viewportV.copy().div(this.imageHeight);

    // Calculate location of upper left pixel
    this.viewportUpperLeft = this.lookFrom.copy();
    this.viewportUpperLeft.sub(this.w.mult(this.focalLength));
    this.viewportUpperLeft.sub(this.viewportU.mult(0.5));
    this.viewportUpperLeft.sub(this.viewportV.mult(0.5));

    this.pixel00 = this.viewportUpperLeft.copy();
    // this.pixel00.add(this.pixelU.mult(0.5));
    // this.pixel00.add(this.pixelV.mult(0.5));

    // well these commented line should really be there but it works without them soooooo
  }
}



// Rotate one vector (vect) around another (axis) by the specified angle.
// Thanks to Paul Wheeler on https://stackoverflow.com/questions/67458592/how-would-i-rotate-a-vector-in-3d-space-p5-js
function rotateAround(vect, axis, angle) {
  axis = p5.Vector.normalize(axis);
  let cosA = cos(angle);
  let sinA = sin(angle);
  return p5.Vector.add(
    p5.Vector.mult(vect, cosA),
    p5.Vector.add(
      p5.Vector.mult(p5.Vector.cross(axis, vect), sinA),
      p5.Vector.mult(axis, p5.Vector.dot(axis, vect) * (1 - cosA))
    )
  );
}