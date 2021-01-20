
var canvas;
var gl;

function mult_v(m, v) {
    if (!m.matrix) {
        return "trying to multiply by non matrix";
    }

    var result;
    if (v.length == 2) result = vec2();
    else if (v.length == 3) result = vec3();
    else if (v.length == 4) result = vec4();
    
    for (var i = 0; i < m.length; i++) {
        if (m[i].length != v.length) 
            return "dimensions do not match";
        
        result[i] = 0;
        for (var j = 0; j < m[i].length; j++)
            result[i] += m[i][j] * v[j];
    }
    return result;
}

/**
 * _3DObject class represents an abstract structure to define 3D objects.
 * Objects should be initialized by passing program id for compiled shaders.
 * Object holds internally references to buffers, vertices, indices and other attributes of an object.
 * Position is a vec3(x, y, z) structure.
 * Model matrix is object transformation matrix, which initially is identity matrix. 
 * Child classes should override loadData method and implement specific vertex, index loading mechanism.
 * TODO: add texture
 */
class _3DObject {
    constructor(program, position = vec3(0, 0, 0)) {
        this.program = program;
        this.bufVertex = 0;
        // this.bufIndex = 0;
        this.bufNormal = 0;
        this.vertices = [];
        this.indices = [];
        this.normals = [];
        this.position = position;
        this.matModel = mat4();
        this.material = {
            ambient: vec3(0.2, 0.3, 0.4),
            diffuse: vec3(0.3, 0.6, 0.5),
            specular: vec3(0.0, 0.0, 0.0),
            shininess: 250.0
        }
    }

    loadData() {
        // do nothing
    }

    init() {
        this.matModel = translate(this.position[0], this.position[1], this.position[2]);
        this.loadData();

        // creating buffer for vertex positions
        this.bufVertex = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufVertex);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

        // creating another buffer for vertex normals
        this.bufNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNormal);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);




    }

    render() {
        // sending material properties
        var ambient = gl.getUniformLocation(this.program, "col_Ambient");
        gl.uniform3fv(ambient, flatten(this.material.ambient));

        var diffuse = gl.getUniformLocation(this.program, "col_Diffuse");
        gl.uniform3fv(diffuse, flatten(this.material.diffuse));

        var specular = gl.getUniformLocation(this.program, "col_Specular");
        gl.uniform3fv(specular, flatten(this.material.specular));

        var shininess = gl.getUniformLocation(this.program, "col_Shininess");
        gl.uniform1f(shininess, this.material.shininess);

        var model = gl.getUniformLocation(this.program, "m_Model");
        gl.uniformMatrix4fv(model, false, flatten(this.matModel));

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufVertex);

        var pos = gl.getAttribLocation(this.program, "v_Pos");
        gl.vertexAttribPointer(pos, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(pos);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNormal);

        var norm = gl.getAttribLocation(this.program, "v_Norm");
        gl.vertexAttribPointer(norm, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(norm);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIndex);
        gl.drawArrays( gl.TRIANGLES, 0, this.vertices.length )
    }



    translate(dir) {
        this.matModel = mult(translate(dir), this.matModel);
    }

    rotate(angle) {
        this.matModel = mult(rotate(angle, vec3(0, 1, 0)), this.matModel);
    }
}

/**
 * 
 */
class Camera {
    constructor(program, position, target, up) {
        this.program = program;
        this.position = position;
        this.target = target;
        this.up = up;
    }

    render() {
        var pos = gl.getUniformLocation(this.program, "v_Camera");
        gl.uniform4fv(pos, flatten(vec4(this.position, 1.0)));

        var view = gl.getUniformLocation(this.program, "m_View");
        var matView = lookAt(this.position, this.target, this.up);
        gl.uniformMatrix4fv(view, false, flatten(matView));

        var proj = gl.getUniformLocation(this.program, "m_Proj");
        var matProj = perspective(90, 1.0, 0.0001, 1000);
        gl.uniformMatrix4fv(proj, false, flatten(matProj));

    }

    rotate(angle,x,y) {
        this.position = vec3(mult_v(rotate(angle, vec3(x, y, 0)), vec4(this.position)));
    }
}

/**
 * 
 */
class Light {
    constructor(program, position) {
        this.program = program;
        this.position = position;
        this.intensity = {
            ambient: vec3(1, 1, 1),
            diffuse: vec3(1.0, 1.0, 1.0),
            specular: vec3(1.0, 1.0, 1.0)
        }
    }

    render() {
        var pos = gl.getUniformLocation(this.program, "v_Light");
        gl.uniform4fv(pos, flatten(this.position));

        // sending light properties
        var ambient = gl.getUniformLocation(this.program, "light_Ambient");
        gl.uniform3fv(ambient, flatten(this.intensity.ambient));

        var diffuse = gl.getUniformLocation(this.program, "light_Diffuse");
        gl.uniform3fv(diffuse, flatten(this.intensity.diffuse));

        var specular = gl.getUniformLocation(this.program, "light_Specular");
        gl.uniform3fv(specular, flatten(this.intensity.specular));
    }

    rotate(angle) {
        this.position = mult_v(rotate(angle, vec3(0, 1, 0)), this.position);
    }
}






class CustomizedCube extends _3DObject {
    constructor(program, position, size = 1, xSize = 1, ySize = 1, zSize = 1) {
        super(program, position);
        this.position = position;
        this.size = size;
        this.xSize = xSize
        this.ySize = ySize
        this.zSize = zSize

        this.initialVertices = [
            vec4(-0.5  * xSize * size, -0.5 * ySize * size,  0.5 * zSize * size, 1.0 ),
            vec4(-0.5  * xSize * size,  0.5 * ySize * size,  0.5 * zSize * size, 1.0 ),
            vec4( 0.5  * xSize * size,  0.5 * ySize * size,  0.5 * zSize * size, 1.0 ),
            vec4( 0.5  * xSize * size, -0.5 * ySize * size,  0.5 * zSize * size, 1.0 ),
            vec4(-0.5  * xSize * size, -0.5 * ySize * size, -0.5 * zSize * size, 1.0 ),
            vec4(-0.5  * xSize * size,  0.5 * ySize * size, -0.5 * zSize * size, 1.0 ),
            vec4( 0.5  * xSize * size,  0.5 * ySize * size, -0.5 * zSize * size, 1.0 ),
            vec4( 0.5  * xSize * size, -0.5 * ySize * size, -0.5 * zSize * size, 1.0 )
        ];
    }

    quad(a, b, c, d) {

        var t1 = subtract(this.initialVertices[b], this.initialVertices[a]);
        var t2 = subtract(this.initialVertices[c], this.initialVertices[b]);
        var normal = cross(t1, t2);
        normal = vec4(normal, 0);


        this.vertices.push(this.initialVertices[a]);
        this.normals.push(normal);
        this.vertices.push(this.initialVertices[b]);
        this.normals.push(normal);
        this.vertices.push(this.initialVertices[c]);
        this.normals.push(normal);
        this.vertices.push(this.initialVertices[a]);
        this.normals.push(normal);
        this.vertices.push(this.initialVertices[c]);
        this.normals.push(normal);
        this.vertices.push(this.initialVertices[d]);
        this.normals.push(normal);
    }

    loadData() {
        this.quad( 1, 0, 3, 2 );
        this.quad( 2, 3, 7, 6 );
        this.quad( 3, 0, 4, 7 );
        this.quad( 6, 5, 1, 2 );
        this.quad( 4, 5, 6, 7 );
        this.quad( 5, 4, 0, 1 );
    }

    
}



var camera;
var light;


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    // canvas.addEventListener('mousedown', function (event) {
    //     mouseDown = true;
    //     vInitial = eventToWorld(event);
    //     vCurrent = vInitial;
    //     console.log(vInitial);
    // });
    // canvas.addEventListener('mouseup', function (event) {
    //     sphereMatrix = mult(calcRotation(), sphereMatrix);
    //     vInitial = vCurrent;
    //     mouseDown = false;
    // });

    // canvas.addEventListener('mousemove', function (event) {
    // if (firstMouse)
    // {
    //     lastX = x;
    //     lastY = y;
    //     firstMouse = false;
    // }

    // var xOffset = x - lastX;
    // var yOffset = lastY - y;
    // lastX = x;
    // lastY = y;

    // camera.rotate(xOffset, yOffset)
    // });
    var arrayX = [];
    arrayX.push(0);

    var arrayY = [];
    arrayY.push(0);


    
    canvas.addEventListener("mousemove", function(event){
    if(arrayX[0]>event.clientX)
        camera.rotate(3,0,1);
    else
        camera.rotate(-3,0,1);
    arrayX.pop();
    arrayX.push(event.clientX);


        
    });

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);


    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");

    gl.useProgram(program);

    camera = new Camera(program, vec3(10.0, 5.0, 10.0), vec3(0, 0, 0), vec3(0, 3, 0));
    // camera = new Camera(program, vec3(9.0, 3.0, 3.0), vec3(0, 0, 0), vec3(0, 1, 0));
    light = new Light(program, vec4(2, 4, 6, 1));
    light2 = new Light(program, vec4(2, 0, 6, 1));







    head = new CustomizedCube(program, vec4(0.0, 7.0, 0.0, 1.0), 2, 2.75, 1.5,1.75);
    head.init();

    body = new CustomizedCube(program, vec4(0.0, 1.0, 0.0, 1.0), 2, 2.5,4.5);
    body.init();

    arm1 = new CustomizedCube(program, vec4(3.0, 1.5, 0.0, 1.0), 2, 0.75, 3.8, 0.9);
    arm1.init();

    arm2 = new CustomizedCube(program, vec4(-3.0, 1.5, 0.0, 1.0), 2, 0.75, 3.8, 0.9);
    arm2.init();

    leg1 = new CustomizedCube(program, vec4(1.5, -8, 0.0, 1.0), 2, 1.0, 4.5);
    leg1.init();
    //
    leg2 = new CustomizedCube(program, vec4(-1.5, -8, 0.0, 1.0), 2, 1.0, 4.5);
    leg2.init();

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // camera.rotate(1);
    camera.render();

    // light.rotate(1);
    light.render();



    head.render();
    body.render();
    arm1.render();
    arm2.render();
    leg1.render();
    leg2.render();
    // arm1.rotate(2);

    requestAnimFrame(render);
}


