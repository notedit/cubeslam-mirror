module.exports = '#ifdef GL_ES\nprecision mediump float;\n#endif\n\nvarying vec2 vUv;\nuniform sampler2D tGrid;\nuniform sampler2D tDigits;\nuniform vec2 scale; \nuniform vec2 points; \n\n\n\n\nfloat thing(vec2 pos) \n{\n    float a = clamp(sin(pos.y / 70.) + sqrt(15.+tan(pos.x)), 0.0, 22.);\n    float b = clamp(cos(pos.x / 70.) + sqrt(25.+tan(pos.y)), 0.3, 10.);\n    return (a + b);\n}\n\nvoid main(void) \n{\n    vec3 lineColor = vec3(0.89453125,0.89453125,0.7734375);\n\n    vec2 position = vUv;\n    float color = texture2D( tGrid, vUv*scale ).x*0.5;\n\n    float color2 = smoothstep( vUv.y,vUv.y+0.007,0.508);\n    color2 -= smoothstep(vUv.y,vUv.y+0.007,0.498);\n\n    if( vUv.y < 0.5 ) {\n        //color2 += texture2D(tDigits,vec2(vUv.x/7.1 + 1.0/7.1*points.x,1.0-(0.5-vUv.y)/4.9)).x;\n        color2 += texture2D(tDigits,vec2(vUv.x/3.55 - 1.0/3.55 + 1.0/3.55*points.x,1.0-(0.5-vUv.y)/2.45)).x;\n    }\n    else {\n        //color2 += texture2D(tDigits,vec2((1.0-vUv.x)/7.1 + 1.0/7.1*points.y,1.0-(0.5-(1.0-vUv.y))/4.9)).x;\n        color2 += texture2D(tDigits,vec2((1.0-vUv.x)/3.55 - 1.0/3.55 + 1.0/3.55*points.y,1.0-(0.5-(1.0-vUv.y))/2.45)).x;\n    }\n\n    vec2 circleCenter = vec2(0.5,0.5);\n    float circleRadius = 0.1;\n    float dist = length(position - circleCenter );\n    float circle = 0.0;//smoothstep(circleRadius,circleRadius - 0.004,dist) - smoothstep(circleRadius*0.93,(circleRadius*.93) - 0.004,dist);\n\n    vec3 gridColor = vec3(color, color, color);\n\n    vec3 centerColor = vec3(color2)*lineColor;\n    \n\n    gl_FragColor = vec4( gridColor*lineColor , step(gridColor.x,0.99) )*0.2 + vec4( centerColor+circle , color2);\n    \n}\n\n';