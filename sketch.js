//GPU shader
let raytracer;

//Camera
let cam;
let imageWidth = 1920;
let aspectRatio = 16/9;
var mouseLocked = false;


function preload() {
  raytracer = loadShader('shaders/shader.vert', 'shaders/shader.frag');
}

function setup() {
  //Camera
  cam = new Camera(aspectRatio, imageWidth);

  //Create the canvas
  pixelDensity(1);
  createCanvas(imageWidth, cam.imageHeight, WEBGL);
  noStroke();
}

function draw() {
  //Update the camera
  cam.move();

  //Update the shader uniforms
  raytracer.setUniform("resolution", [width, height]);
  raytracer.setUniform("pixel00", [cam.pixel00.x, cam.pixel00.y, cam.pixel00.z]);
  raytracer.setUniform("pixelU", [cam.pixelU.x, cam.pixelU.y, cam.pixelU.z]);
  raytracer.setUniform("pixelV", [cam.pixelV.x, cam.pixelV.y, cam.pixelV.z])
  raytracer.setUniform("cameraCenter", [cam.center.x, cam.center.y, cam.center.z]);
  
  //Run the shader
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
    cam.center.add(0, 0, event.delta / 500);
  }
}


class Camera {
  constructor(aspectRatio, imageWidth) {
    //Calculate the image height
    this.imageHeight = int(imageWidth / aspectRatio);
    this.imageHeight = max(1, this.imageHeight);

    //Set initial camera position
    this.center = createVector(0.0, 0.0, 1.0);

    //Calculate viewport dimensions
    this.focalLength = 1.0;
    this.viewportHeight = 2.0;
    this.viewportWidth = this.viewportHeight * (imageWidth / this.imageHeight);

    //Calculate vectors along horizontal and vertical viewport edges
    this.viewportU = createVector(this.viewportWidth, 0, 0);
    this.viewportV = createVector(0, this.viewportHeight, 0);

    //Calculate the horizontal and vertical delta vectors between pixels
    this.pixelU = createVector(this.viewportU.x / imageWidth, 0, 0);
    this.pixelV = createVector(0, this.viewportV.y / this.imageHeight, 0);

    this.update();
  }

  move() {
    if (mouseLocked) {
      this.center.add(movedX / 100, - movedY / 100, 0);
      this.update();
    }
  }

  update() {
    //Calculate location of upper left pixel
    this.viewportUpperLeft = createVector(this.center.x, this.center.y, this.center.z);
    this.viewportUpperLeft.add(-this.viewportWidth/2, -this.viewportHeight/2, -this.focalLength);
    this.pixel00 = createVector(this.viewportUpperLeft.x, this.viewportUpperLeft.y, this.viewportUpperLeft.z);
    this.pixel00.add(this.pixelU.x * 0.5, this.pixelV.y * 0.5)
  }
}