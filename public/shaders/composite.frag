precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_renderingTexture;
uniform sampler2D u_occlusionTexture;

uniform vec2 u_resolution;
uniform float u_fov;

uniform mat4 u_inverseViewMatrix;

uniform sampler2D u_shadowDepthTexture;
uniform vec2 u_shadowResolution;
uniform mat4 u_lightProjectionViewMatrix;

float linearstep (float left, float right, float x) {
    return clamp((x - left) / (right - left), 0.0, 1.0);
}

vec3 hsvToRGB(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main () {
    vec4 data = texture2D(u_renderingTexture, v_coordinates);
    float occlusion = texture2D(u_occlusionTexture, v_coordinates).r;

    vec3 viewSpaceNormal = vec3(data.x, data.y, sqrt(1.0 - data.x * data.x - data.y * data.y));

    float viewSpaceZ = data.a;
    vec3 viewRay = vec3(
        (v_coordinates.x * 2.0 - 1.0) * tan(u_fov / 2.0) * u_resolution.x / u_resolution.y,
        (v_coordinates.y * 2.0 - 1.0) * tan(u_fov / 2.0),
        -1.0);

    vec3 viewSpacePosition = viewRay * -viewSpaceZ;
    vec3 worldSpacePosition = vec3(u_inverseViewMatrix * vec4(viewSpacePosition, 1.0));

    float speed = data.b;
    vec3 color = hsvToRGB(vec3(max(0.62 - speed * 0.002, 0.50), 0.82, 1.0));


    vec4 lightSpacePosition = u_lightProjectionViewMatrix * vec4(worldSpacePosition, 1.0);
    lightSpacePosition /= lightSpacePosition.w;
    lightSpacePosition *= 0.5;
    lightSpacePosition += 0.5;
    vec2 lightSpaceCoordinates = lightSpacePosition.xy;
    
    float shadow = 1.0;
    const int PCF_WIDTH = 2;
    const float PCF_NORMALIZATION = float(PCF_WIDTH * 2 + 1) * float(PCF_WIDTH * 2 + 1);

    for (int xOffset = -PCF_WIDTH; xOffset <= PCF_WIDTH; ++xOffset) {
        for (int yOffset = -PCF_WIDTH; yOffset <= PCF_WIDTH; ++yOffset) {
            float shadowSample = texture2D(u_shadowDepthTexture, lightSpaceCoordinates + 5.0 * vec2(float(xOffset), float(yOffset)) / u_shadowResolution).r;
            if (lightSpacePosition.z > shadowSample + 0.001) shadow -= 1.0 / PCF_NORMALIZATION;
        }
    }


    float ambient = 1.0 - occlusion * 0.7;
    float direct = 1.0 - (1.0 - shadow) * 0.8;

    color *= ambient * direct;

    if (speed >= 0.0) {
        gl_FragColor = vec4(color, 1.0);
    } else {
        vec2 uv = v_coordinates * 2.0 - 1.0;
        float vignette = length(uv) * 0.4;
        vec3 bgBase = mix(vec3(0.045, 0.030, 0.090), vec3(0.008, 0.006, 0.022), vignette);

        // Subtle fine-grid texture — thin lines every ~28 px
        vec2 px = v_coordinates * u_resolution;
        float gridSpacing = 28.0;
        vec2 cellFrac = fract(px / gridSpacing);
        float lineW = 0.04; // fraction of cell
        float hLine = 1.0 - smoothstep(0.0, lineW, cellFrac.y) + smoothstep(1.0 - lineW, 1.0, cellFrac.y);
        float vLine = 1.0 - smoothstep(0.0, lineW, cellFrac.x) + smoothstep(1.0 - lineW, 1.0, cellFrac.x);
        float gridMask = clamp(hLine + vLine, 0.0, 1.0);
        // Grid lines appear as a slightly lighter purple-blue tint
        bgBase += vec3(0.028, 0.016, 0.055) * gridMask * (1.0 - vignette * 0.6);

        gl_FragColor = vec4(bgBase, 1.0);
    }

    //gl_FragColor = vec4(texture2D(u_shadowDepthTexture, v_coordinates).rrr, 1.0);
}
