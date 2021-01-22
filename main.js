
var canvas;
var gl;
var seconds = 0;
var texFlag = true;

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


/**
 *
 */
class Camera {
    constructor(program, position, target, up) {
        this.program = program;
        this.position = position;
        this.target = target;
        this.up = up;
        this.SENSITIVITY = 0.1
        this.yaw = -134.0
        this.pitch = -27.0
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

    rotate(angle) {
        this.position = vec3(mult_v(rotate(angle, vec3(0, 1, 0)), vec4(this.position)));
    }

    rotate(xOffset, yOffset)
    {
        xOffset *= this.SENSITIVITY;
        yOffset *= this.SENSITIVITY;

        this.yaw += xOffset
        this.pitch += yOffset

        if(this.pitch > 89.0) this.pitch = 89.0
        if(this.pitch < -89.0) this.pitch = -89.0

        var directionX = Math.cos(radians(this.yaw)) * Math.cos(radians(this.pitch))
        var directionY = Math.sin(radians(this.pitch));
        var directionZ = Math.sin(radians(this.yaw)) * Math.cos(radians(this.pitch))
        var direction = vec3(directionX, directionY, directionZ)

        this.target = add(this.position, normalize(direction))
    }

    translateBy(x, y, z)
    {
        this.position = vec3(mult_v(translate(x, y, z), vec4(this.position)));
    }
}




/**
 * _3DObject class represents an abstract structure to define 3D objects.
 * Objects should be initialized by passing program id for compiled shaders.
 * Object holds internally references to buffers, vertices, indices and other attributes of an object.
 * Position is a vec3(x, y, z) structure.
 * Model matrix is object transformation matrix, which initially is identity matrix. 
 * Child classes should override loadData method and implement specific vertex, index loading mechanism.
 */
class _3DObject {
    constructor(program, position = vec3(0, 0, 0)) {
        this.program = program;
        this.bufVertex = 0;
        this.bufNormal = 0;

        this.vertices = [];
        this.normals = [];

        this.position = position;
        this.matModel = mat4();
        this.material = {
            ambient: vec3(0.2, 0.3, 0.4),
            diffuse: vec3(0.3, 0.6, 0.5),
            specular: vec3(0.0, 0.0, 0.0),
            shininess: 250.0
        }

        this.texCoordsArray = [];
        this.texture = [];

        this.texCoordsArray2 = [];
        this.texture2 = [];

        this.texCoord = [
            vec2(0, 0),
            vec2(0, 1),
            vec2(1, 1),
            vec2(1, 0)
        ]

        this.headBack = [
            vec2(0.0, 0.375),
            vec2(0.0, 0.625),
            vec2(0.25, 0.625),
            vec2(0.25, 0.375)
        ]

        this.ear1Tex = [
            vec2(0.25, 0.375),
            vec2(0.25, 0.625),
            vec2(0.5, 0.625),
            vec2(0.5, 0.375)
        ]

        this.faceTex = [
            vec2(0.5, 0.375),
            vec2(0.5, 0.625),
            vec2(0.75, 0.625),
            vec2(0.75, 0.375)
        ]

        this.ear2tex = [
            vec2(0.75, 0.375),
            vec2(0.75, 0.625),
            vec2(1.0, 0.625),
            vec2(1.0, 0.375)
        ]

        this.headupTex = [
            vec2(0.25, 0.375),
            vec2(0.25, 0.12),
            vec2(0.5, 0.12),
            vec2(0.5, 0.375)
        ]

        this.neckTex = [
            vec2(0.25, 0.88),
            vec2(0.25, 0.625),
            vec2(0.5, 0.625),
            vec2(0.5, 0.88)
        ]
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

        // creating texture for buffer
        this.bufTexture = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.bufTexture );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.texCoordsArray), gl.STATIC_DRAW );

        var image = document.getElementById("texImage");
        this.configureTexture( image );

        // creating texture for buffer2
        this.bufTexture2 = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.bufTexture2 );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.texCoordsArray2), gl.STATIC_DRAW );

        var image2 = document.getElementById("texImage2");
        this.configureTexture2(image2);
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

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTexture);
        // gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTexture2);


        var vTexCoord = gl.getAttribLocation( this.program, "vTexCoord" );
        gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vTexCoord );

        var vTexCoord2 = gl.getAttribLocation( this.program, "vTexCoord2" );
        gl.vertexAttribPointer( vTexCoord2, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vTexCoord2 );

        gl.drawArrays( gl.TRIANGLES, 0, this.vertices.length )
    }

    configureTexture( image ) {
        this.texture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.texture );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB,
            gl.RGB, gl.UNSIGNED_BYTE, image );
        gl.generateMipmap( gl.TEXTURE_2D );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
            gl.NEAREST_MIPMAP_LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

        gl.uniform1i(gl.getUniformLocation(this.program, "texture"), 0);
        gl.activeTexture(gl.TEXTURE0);
    }

    configureTexture2( image2 ) {
        this.texture2 = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, this.texture2 );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB,
            gl.RGB, gl.UNSIGNED_BYTE, image2 );
        gl.generateMipmap( gl.TEXTURE_2D );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
            gl.NEAREST_MIPMAP_LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

        gl.uniform1i(gl.getUniformLocation(this.program, "texture2"), 1);
        gl.activeTexture(gl.TEXTURE1);
    }



    translate(dir) {
        this.matModel = mult(translate(dir), this.matModel);
    }

    rotate(angle) {
        this.matModel = mult(rotate(angle, vec3(1, 0, 0)), this.matModel);
    }
}


class CustomizedCube extends _3DObject {
    constructor(program, position, size = 1, xSize = 1, ySize = 1, zSize = 1,headFlag=1) {
        super(program, position);
        this.position = position;
        this.size = size;
        this.xSize = xSize;
        this.ySize = ySize;
        this.zSize = zSize;
        this.headFlag = headFlag;


        this.initialVertices = [
            vec4(-0.5  * this.xSize * this.size, -0.5 * this.ySize * this.size,  0.5 * this.zSize * this.size, 1.0 ),
            vec4(-0.5  * this.xSize * this.size,  0.5 * this.ySize * this.size,  0.5 * this.zSize * this.size, 1.0 ),
            vec4( 0.5  * this.xSize * this.size,  0.5 * this.ySize * this.size,  0.5 * this.zSize * this.size, 1.0 ),
            vec4( 0.5  * this.xSize * this.size, -0.5 * this.ySize * this.size,  0.5 * this.zSize * this.size, 1.0 ),
            vec4(-0.5  * this.xSize * this.size, -0.5 * this.ySize * this.size, -0.5 * this.zSize * this.size, 1.0 ),
            vec4(-0.5  * this.xSize * this.size,  0.5 * this.ySize * this.size, -0.5 * this.zSize * this.size, 1.0 ),
            vec4( 0.5  * this.xSize * this.size,  0.5 * this.ySize * this.size, -0.5 * this.zSize * this.size, 1.0 ),
            vec4( 0.5  * this.xSize * this.size, -0.5 * this.ySize * this.size, -0.5 * this.zSize * this.size, 1.0 )
        ];
    }

    quad(a, b, c, d, texChooser) {

        var t1 = subtract(this.initialVertices[b], this.initialVertices[a]);
        var t2 = subtract(this.initialVertices[c], this.initialVertices[b]);
        var normal = cross(t1, t2);
        normal = vec4(normal, 0);

        var texCoord = []
        var texCoord2 = []
        switch (texChooser)
        {
            case 1:
                texCoord = this.faceTex
                break
            case 2:
                texCoord = this.ear1Tex
                break
            case 3:
                texCoord = this.neckTex
                break
            case 4:
                texCoord = this.headupTex
                break
            case 5:
                texCoord = this.headBack
                break
            case 6:
                texCoord = this.ear2tex
                break
        }

        texCoord2 = this.texCoord;


        this.vertices.push(this.initialVertices[a]);
        this.normals.push(normal);
        this.texCoordsArray.push(texCoord[0]);
        this.texCoordsArray2.push(texCoord2[0])

        this.vertices.push(this.initialVertices[b]);
        this.normals.push(normal);
        this.texCoordsArray.push(texCoord[1]);
        this.texCoordsArray2.push(texCoord2[1])


        this.vertices.push(this.initialVertices[c]);
        this.normals.push(normal);
        this.texCoordsArray.push(texCoord[2]);
        this.texCoordsArray2.push(texCoord2[2])


        this.vertices.push(this.initialVertices[a]);
        this.normals.push(normal);
        this.texCoordsArray.push(texCoord[0]);
        this.texCoordsArray2.push(texCoord2[0])


        this.vertices.push(this.initialVertices[c]);
        this.normals.push(normal);
        this.texCoordsArray.push(texCoord[2]);
        this.texCoordsArray2.push(texCoord2[2])


        this.vertices.push(this.initialVertices[d]);
        this.normals.push(normal);
        this.texCoordsArray.push(texCoord[3]);
        this.texCoordsArray2.push(texCoord2[3])

    }

    loadData() {
        if(this.headFlag == 1){
            this.quad( 1, 0, 3, 2 , 1);
            this.quad( 2, 3, 7, 6 , 2);
            this.quad( 3, 0, 4, 7 , 3);
            this.quad( 6, 5, 1, 2 , 4);
            this.quad( 4, 5, 6, 7 , 5);
            this.quad( 5, 4, 0, 1 , 6);
        } else if (this.headFlag == 2){
            this.quad( 1, 0, 3, 2 , 3);
            this.quad( 2, 3, 7, 6 , 3);
            this.quad( 3, 0, 4, 7 , 3);
            this.quad( 6, 5, 1, 2 , 3);
            this.quad( 4, 5, 6, 7 , 3);
            this.quad( 5, 4, 0, 1 , 3);
        } else {
            this.quad( 1, 0, 3, 2 , 4);
            this.quad( 2, 3, 7, 6 , 4);
            this.quad( 3, 0, 4, 7 , 4);
            this.quad( 6, 5, 1, 2 , 4);
            this.quad( 4, 5, 6, 7 , 4);
            this.quad( 5, 4, 0, 1 , 4);
        }

    }

    
}



var camera;
var light;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");


    var cameraUp = vec3(-0.1, -0.05, -0.1);
    var cameraDown    = vec3(0.1, 0.05, 0.1);
    var cameraLeft = vec3(-0.1, 0.0, 0.0);
    var cameraRight    = vec3(0.1, 0.0, 0.0);

    document.addEventListener('keydown', (event) => {

        if (event.key == 'ArrowUp') {
            var front = normalize(subtract(camera.target, camera.position)) * 0.5
            camera.translateBy(front);

            console.log(camera.position);

        } else if (event.key == 'ArrowDown'){
            camera.position = add(camera.position, cameraDown);
            console.log("down");

        } else if (event.key == 'ArrowLeft'){
            camera.position = add(camera.position, cameraLeft);
            console.log("left");

        } else if (event.key == 'ArrowRight'){
            camera.position = add(camera.position, cameraRight);
            console.log("right");

        } else if (event.key == 'w'){

        } else if (event.key == 'a'){

        } else if (event.key == 's'){

        } else if (event.key == 'd'){

        }
    });



    var lastX = canvas.width / 2
    var lastY = canvas.height / 2
    var firstMouse = true

    canvas.addEventListener('mousemove', function (event) {
    if (firstMouse)
    {
        lastX = event.clientX;
        lastY = event.clientY;
        firstMouse = false;
    }

    var xOffset = event.clientX - lastX;
    var yOffset = lastY - event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;

    camera.rotate(xOffset, yOffset);
    // console.log(camera.position);
    });


    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);




    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");

    gl.useProgram(program);

    // camera = new Camera(program, vec3(10.0, 5.0, 10.0), vec3(0, 0, 0), vec3(0, 3, 0));
    camera = new Camera(program, vec3(10.0, 5.0, 10.0), vec3(0, 0, 0), vec3(0, 1, 0));
    light = new Light(program, vec4(2, 4, 6, 1));


    head = new CustomizedCube(program, vec4(0.0, 7.0, 0.0, 1.0), 2, 2.75, 1.5,1.75);
    texFlag = true;
    head.init();

    body = new CustomizedCube(program, vec4(0.0, 1.0, 0.0, 1.0), 2, 2.5,4.5,1,5);
    body.init();

    arm1 = new CustomizedCube(program, vec4(3.4, 1.5, 0.0, 1.0), 2, 0.75, 3.8, 0.9,2);
    arm1.init();

    arm2 = new CustomizedCube(program, vec4(-3.4, 1.5, 0.0, 1.0), 2, 0.75, 3.8, 0.9,2);
    arm2.init();

    leg1 = new CustomizedCube(program, vec4(1.5, -8, 0.0, 1.0), 2, 1.0, 4.5,1,5);
    leg1.init();
    
    leg2 = new CustomizedCube(program, vec4(-1.5, -8, 0.0, 1.0), 2, 1.0, 4.5,1,5);
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

    

    if (seconds < 50){
        leg1.rotate(-0.5);
        leg2.rotate(0.5);
        arm1.translate(vec3(0, -8, 0))
        arm1.rotate(0.5);
        arm1.translate(vec3(0,  8, 0))

        arm2.translate(vec3(0, -8, 0))
        arm2.rotate(-0.5);
        arm2.translate(vec3(0,  8, 0))


    } else {
        leg1.rotate(0.5);
        leg2.rotate(-0.5);
        arm1.translate(vec3(0, -8, 0))
        arm1.rotate(-0.5);
        arm1.translate(vec3(0, 8, 0))

        arm2.translate(vec3(0, -8, 0))
        arm2.rotate(0.5);
        arm2.translate(vec3(0, 8, 0))

        if(seconds >= 125){
            seconds = -25;
        }
    }



    requestAnimFrame(render);
    seconds++;
    // console.log(seconds);
}


