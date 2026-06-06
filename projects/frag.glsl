
precision highp float;

#define PI 3.14159265358979
// From vertex shader
in vec2 vUv;

// Uniforms
uniform vec3 u_matColors[8];
uniform float u_matRoughness[8];
uniform vec3 u_clearColor;

uniform float u_hitThresh;
uniform float u_maxDist;
uniform int u_maxSteps;

uniform vec3 u_camPos;
uniform mat4 u_camToWorldMat;
uniform mat4 u_camInvProjMat;

uniform vec3 u_lightDir;
uniform vec3 u_lightColor;

uniform float u_diffIntensity;
uniform float u_ambientIntensity;

uniform float u_time;


// ------ structs ------


// Carries distance + material data through the scene
struct surface {
    float sdf;
    vec3  color;
    float roughness;
    float isMetal; 
};


struct baseLight {
    vec3 color;
    float diffuseIntensity; 
    float ambientIntensity; 
};


// ------ Signed Distance Functions ------

float sdSphere( vec3 pos, float r ) {
    return length(pos) - r;
}

float sdBox( vec3 pos, vec3 dimensions) {

    vec3 b = vec3(dimensions.x, dimensions.z, dimensions.y);
    vec3 q = abs(pos) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus( vec3 pos, vec2 t ) {
    vec2 q = vec2(length(pos.xz) - t.x, pos.y);
    return length(q) - t.y;
}

float sdPyramid( vec3 pos, float height ) {
    float m2 = height*height + 0.25;

    pos.xz = abs(pos.xz);
    pos.xz = (pos.z > pos.x) ? pos.zx : pos.xz;
    pos.xz -= 0.5;

    vec3 q = vec3( pos.z, height*pos.y - 0.5*pos.x, height*pos.x + 0.5*pos.y );
    float s  = max(-q.x, 0.0);
    float t  = clamp((q.y - 0.5*pos.z) / (m2 + 0.25), 0.0, 1.0);
    float a  = m2*(q.x + s)*(q.x + s) + q.y*q.y;
    float b  = m2*(q.x + 0.5*t)*(q.x + 0.5*t) + (q.y - m2*t)*(q.y - m2*t);
    float d2 = min(q.y, -q.x*m2 - q.y*0.5) > 0.0 ? 0.0 : min(a, b);

    return sqrt((d2 + q.z*q.z) / m2) * sign(max(q.z, -pos.y));
}

float sdLink( vec3 pos, float le, float r1, float r2 ) {
    vec3 q = vec3(pos.x, max(abs(pos.y) - le, 0.0), pos.z);
    return length(vec2(length(q.xy) - r1, q.z)) - r2;
}

float sdPlane( vec3 p, vec4 n ) {
  // n must be normalized
  return dot(p,n.xyz) + n.w;
}  

float sdCapsule( vec3 pos, vec3 startPos, vec3 endPos, float radius ) {
  vec3 pa = pos - startPos, ba = endPos - startPos;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - radius;
}

// ------ Operators (float) ------
// For composing distances only — e.g. rounding: sdBox(...) - 0.25

float bsUnion( float d1, float d2 )              { return min(d1, d2); }
float bsSub  ( float d1, float d2 )              { return max(-d1, d2); }
float bsInt  ( float d1, float d2 )              { return max(d1, d2); }

float smUnion( float d1, float d2, float k ) {
    float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h);
}
float smSub  ( float d1, float d2, float k ) {
    float h = clamp(0.5 - 0.5*(d2+d1)/k, 0.0, 1.0);
    return mix(d2, -d1, h) + k*h*(1.0-h);
}
float smInt  ( float d1, float d2, float k ) {
    float h = clamp(0.5 - 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) + k*h*(1.0-h);
}


// ------ Operators (surface) ------
// Same operators but carry color through. Colors blend on smooth joins.

surface bsUnion( surface a, surface b ) {
    if (a.sdf < b.sdf) {
        return a;
    } else {
        return b;
    }
}

surface bsSub( surface a, surface b ) {
    if (-a.sdf > b.sdf) {
        surface result;
        result.sdf = -a.sdf;
        result.color = a.color;
        result.roughness = a.roughness;
        result.isMetal = a.isMetal;
        return result;
    } else {
        return b;
    }
}

surface smUnion( surface a, surface b, float k ) {
    float h = clamp(0.5 + 0.5*(b.sdf - a.sdf)/k, 0.0, 1.0);
    surface final;
    final.sdf = mix(b.sdf,  a.sdf,  h) - k*h*(1.0-h);
    final.color = mix(b.color, a.color, h);
    final.roughness = mix(b.roughness, a.roughness, h);
    final.isMetal = mix(b.isMetal, a.isMetal, h);
    return final;
}



// ------ Rotation Helpers ------

// radians
mat2 rot2D( float angle ) {
    float s = sin(angle), c = cos(angle);
    return mat2(c, -s, s, c);
}

// degrees
mat2 degrot2D( float angle ) {
    return rot2D(radians(angle));
}


// Scene Modules

surface balls(vec3 pos,  vec3 masterPos ) {
    surface sphere1;
    sphere1.color = u_matColors[0];
    sphere1.roughness = u_matRoughness[0];
    sphere1.isMetal = 0.0;

    surface sphere2;
    sphere2.color = u_matColors[1];
    sphere2.roughness = u_matRoughness[1];
    sphere2.isMetal = 0.0;

    surface sphere3;
    sphere3.color = u_matColors[2];
    sphere3.roughness = u_matRoughness[2];
    sphere3.isMetal = 0.0;

    
    vec3 sphere1Pos = vec3(
        masterPos.x -cos(u_time *0.7) - 0.3 * cos(u_time * 2.3),
        masterPos.y -sin(u_time * 1.1) - 0.2 * sin(u_time * 3.1),
        masterPos.z
    );

    vec3 sphere2Pos = vec3(
        masterPos.x +cos(u_time * 1.1) + 0.3 * cos(u_time * 2.7),
        masterPos.y +sin(u_time * 1.0) + 0.2 * sin(u_time * 0.8),
        masterPos.z
    );

    vec3 sphere3Pos = vec3(
        masterPos.x,
        masterPos.y,
        masterPos.z
    );
    
    sphere1.sdf = sdSphere(pos - sphere1Pos, 0.5);

    sphere2.sdf = sdSphere(pos - sphere2Pos, 0.4);

    sphere3.sdf = sdSphere(pos - sphere3Pos, 0.3);

    surface balls1 = smUnion(sphere1, sphere2, 0.5);
    surface ballsFinal = smUnion(balls1, sphere3, 0.5);

    return ballsFinal;

}

// surface arrow( vec3 pos, vec3 startPos, vec3 endPos, float headLength, float radius) {
//     float body = sdCapsule(pos, startPos, endPos, radius);

    


// }

surface origin( vec3 pos ) { 
    surface x;
    surface y;
    surface z;

    vec3 a1 = vec3(-0.5, 0.0, 0.0);
    vec3 b1 = vec3(0.5, 0.0, 0.0); 
    x.sdf = sdCapsule(pos, a1, b1, 0.01);

    vec3 a2 = vec3(0.0, -0.5, 0.0);
    vec3 b2 = vec3(0.0, 0.5, 0.0);
    y.sdf = sdCapsule(pos, a2, b2, 0.01);

    vec3 a3 = vec3(0.0, 0.0, -0.5);
    vec3 b3 = vec3(0.0, 0.0, 0.5);
    z.sdf = sdCapsule(pos, a3, b3, 0.01);

    x.color = vec3(1.0, 0.0, 0.0);
    x.roughness = 0.5;
    x.isMetal = 0.0;

    y.color = vec3(0.0, 1.0, 0.0);
    y.roughness = 0.5;
    y.isMetal = 0.0;

    z.color = vec3(0.0, 0.0, 1.0);
    z.roughness = 0.5;
    z.isMetal = 0.0;

    surface xy = bsUnion(x, y);
    surface result = bsUnion(xy, z);
    return result;


}

surface ground( vec3 pos ) {
    surface ground;

    ground.color = u_matColors[3];
    ground.roughness = u_matRoughness[3];
    ground.isMetal = 0.0;
    ground.sdf = sdPlane(pos, vec4(0, 1, 0, 1.5));

    return ground;
}

surface pyramid(vec3 pos, vec3 offset, float height, float isMetal) {
    surface pyramid;

    pyramid.color = u_matColors[4];
    pyramid.roughness = u_matRoughness[4];
    pyramid.isMetal = isMetal;
    pyramid.sdf = sdPyramid(pos - offset, height);

    return pyramid;
}

surface house( vec3 pos, vec3 housePos, vec3 dimensions, float roofHeight, float roofScale, float masterScale, vec3 wallColor, float wallRoughness, float wallMetal, vec3 roofColor, float RoofRoughness, float roofMetal, float wallThickness ) {

    float wallCube = sdBox(pos, dimensions);


    float interiorBool = sdBox(pos, dimensions - wallThickness); 

    vec3 g = dimensions / 3.0;
    vec3 h = pos;
    float doorBool = sdBox(h + 2.0, g);

    return surface(interiorBool, wallColor, wallRoughness, wallMetal);


    // return surface(doorBool, wallColor, wallRoughness, wallMetal);

    surface walls = surface(0.0, wallColor, wallRoughness, wallMetal );
    walls.sdf = bsSub(interiorBool, wallCube);


    
    float wallHeight = dimensions.z / roofScale;

    vec3 roofpos = pos / roofScale;
    surface roof;
    roof.sdf = sdPyramid(vec3(roofpos.x, roofpos.y-wallHeight, roofpos.z), roofHeight) / roofScale;
    roof.color = roofColor;
    roof.roughness = RoofRoughness;
    roof.isMetal = roofMetal;

    return bsUnion(walls, roof);
}

// ***** ***** ***** Scene ***** ***** *****

surface map(vec3 pos) {

    surface balls = balls(pos, vec3(0.0, 1.0, 0.0));

    surface ground = ground(pos);

    surface result = bsUnion(ground, balls);

    return result;
}



// ***** ***** ***** Marching ***** ***** *****

float rayMarch( vec3 rayOrigin, vec3 rayDir ) {
    float t = 0.0;
    for (int i = 0; i < u_maxSteps; ++i) {
        vec3 pos = rayOrigin + rayDir * t;
        float d  = map(pos).sdf;
        if (d < u_hitThresh || t > u_maxDist) break;
        t += d;
    }
    return t;
}

float shadowMarch(vec3 hitPos, vec3 lightDir) {
    float t = 0.001;
    for (int i = 0; i < 128; ++i) {
        
        vec3 pos = hitPos + lightDir * t;
        
        float dist = map(pos).sdf;
       
        if (dist < 0.0001) return 0.0;
        if (t > 10.0) break;
        t += dist;
    }
    return 1.0;
}



// ***** ***** ***** PBR etc ***** ***** *****

//normal calculations
vec3 calcNormal( vec3 pos ) {
    float e = 0.0001;
    return normalize(vec3(
        map(pos + vec3(e, 0, 0)).sdf - map(pos - vec3(e, 0, 0)).sdf,
        map(pos + vec3(0, e, 0)).sdf - map(pos - vec3(0, e, 0)).sdf,
        map(pos + vec3(0, 0, e)).sdf - map(pos - vec3(0, 0, e)).sdf
    ));
}


//Normal Distribution Function 
float ggxDistribution(float nDotH, surface mat){
    float alpha2 = mat.roughness * mat.roughness * mat.roughness * mat.roughness;
    float d = nDotH * nDotH * (alpha2 - 1.0) + 1.0;
    float ggxDistr = alpha2 / (PI * d * d);
    return ggxDistr; 
}


//Smith geometry 
float geomSmith(float nDotV, float nDotL, surface mat){

    float k = (mat.roughness + 1.0) * (mat.roughness + 1.0) / 8.0; 
    float gV = nDotV / ( nDotV * (1.0 - k) + k );
    float gL = nDotL / ( nDotL * (1.0 - k) + k );

    return gV * gL;
}


//schlick fresnel 
vec3 schlickFresnel(float vDotH, surface mat){
    vec3 F0 = mix(vec3(0.04), mat.color, mat.isMetal);
    vec3 fresnel = F0 + (1.0 - F0) * pow((1.0 - vDotH), 5.0);
    return fresnel;
}



//PBR Main 
vec3 calcPBR(baseLight light, surface mat, vec3 rayOrigin, vec3 hitPos, vec3 posDir, bool isDirLight){
    
    vec3 lightIntensity = light.color * light.diffuseIntensity;
    vec3 l = vec3(0.0);

    if (isDirLight) {
        l = -posDir.xyz;
    } else {
        l = posDir - hitPos; 
        float lightToHit = length(l);
        l = normalize(l);
        lightIntensity /= (lightToHit * lightToHit); 
    }

    vec3 n = normalize(calcNormal(hitPos));
    vec3 lightDir  = normalize(u_lightDir);
    vec3 viewDir   = normalize(rayOrigin - hitPos);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    float nDotH = max(dot(n, halfwayDir), 0.0);
    float vDotH = max(dot(viewDir, halfwayDir), 0.0);
    float nDotL = max(dot(n, lightDir), 0.0);
    float nDotV = max(dot(n, viewDir), 0.0);


    vec3 F = schlickFresnel(vDotH, mat);
    vec3 kS = F;
    vec3 kD = 1.0 - kS; 
    vec3 fLambert = mat.color;

    //kD + kS = 1.0; 
    vec3 diffuse = kD * fLambert / PI; 


    vec3 specularNominator = F * ggxDistribution(nDotH, mat) * geomSmith(nDotV, nDotL, mat);
    float specularDenominator = 4.0 * nDotL * nDotV + 0.0001;
    vec3 specular = specularNominator / specularDenominator;
    vec3 ambient = light.color * light.ambientIntensity * mat.color;

    float shadow = shadowMarch(hitPos, lightDir);

    vec3 finalColor = ambient + (diffuse + specular) * lightIntensity * nDotL * shadow;
    return finalColor;
}




void main() {

    vec2 uv         = vUv.xy;
    vec3 rayOrigin = u_camPos;
    vec3 rayDir    = (u_camInvProjMat * vec4(uv * 2.0 - 1.0, 0.0, 1.0)).xyz;
    rayDir         = normalize((u_camToWorldMat * vec4(rayDir, 0.0)).xyz);

    float t = rayMarch(rayOrigin, rayDir);

    baseLight light;
    light.color = u_lightColor;
    light.diffuseIntensity = u_diffIntensity;
    light.ambientIntensity = u_ambientIntensity;


    if (t >= u_maxDist) {
        gl_FragColor = vec4(u_clearColor, 1.0);
    } else {
        vec3 hitPos = rayOrigin + rayDir * t;
        surface hit = map(hitPos);
        vec3 color = calcPBR(light , hit, rayOrigin, hitPos, u_lightDir, true);
        gl_FragColor = vec4(color, 1.0);
       
    }
}
