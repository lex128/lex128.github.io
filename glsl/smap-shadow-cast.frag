precision mediump float;

uniform sampler2D uSampler;
varying vec2 vTextureCoord;

uniform vec2 viewResolution;

uniform sampler2D shadowMapChannel;

uniform vec4 uAmbient;
uniform vec4 uLightPosition[CONST_LIGHTS_COUNT];
uniform vec4 uLightColor[CONST_LIGHTS_COUNT];

const float PI = 3.14159265358979;
const float THETA = cos(30./180.*3.14159265358979);

vec4 takeSample(in sampler2D texture, in vec2 coord, in float light) {
	return step(light, texture2D(texture, coord));
}

vec4 blurFn(in sampler2D texture, in vec2 tc, in float light, in float iBlur) {
	float blur = iBlur / viewResolution.x;
	vec4 sum = vec4(0.);
	sum += takeSample(texture, vec2(tc.x - 5.*blur, tc.y), light) * 0.022657;
	sum += takeSample(texture, vec2(tc.x - 4.*blur, tc.y), light) * 0.046108;
	sum += takeSample(texture, vec2(tc.x - 3.*blur, tc.y), light) * 0.080127;
	sum += takeSample(texture, vec2(tc.x - 2.*blur, tc.y), light) * 0.118904;
	sum += takeSample(texture, vec2(tc.x - 1.*blur, tc.y), light) * 0.150677;

	sum += takeSample(texture, vec2(tc.x, tc.y), light) * 0.163053;

	sum += takeSample(texture, vec2(tc.x + 1.*blur, tc.y), light) * 0.150677;
	sum += takeSample(texture, vec2(tc.x + 2.*blur, tc.y), light) * 0.118904;
	sum += takeSample(texture, vec2(tc.x + 3.*blur, tc.y), light) * 0.080127;
	sum += takeSample(texture, vec2(tc.x + 4.*blur, tc.y), light) * 0.046108;
	sum += takeSample(texture, vec2(tc.x + 5.*blur, tc.y), light) * 0.022657;
	return sum;
}

void main() {
	// Изначально освещение у нас черное
	vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

	// Вспомогательная переменная для чтения источника света.
	float lightLookupHalfStep = (1.0 / float(CONST_LIGHTS_COUNT)) * .5;

	// В цикле перебираем все источники света
	for (int i = 0; i < CONST_LIGHTS_COUNT; i += 1) {
		float lightSize = 1000. / max(viewResolution.x, viewResolution.y);
		if (lightSize == 0.) {
			// Если размер нулевой, то продолжать смысла нет.
			continue;
		}
		vec2 lightPosition = uLightPosition[i].xy / viewResolution;
		vec2 lightDirection = uLightPosition[i].zw / viewResolution;
		vec4 lightColor = uLightColor[i];
		// Результат для конкретного источника света
		vec3 lightLuminosity = vec3(0.0);

		// Координата Y этого источника на карте теней.
		float yCoord = float(i) / float(CONST_LIGHTS_COUNT) + lightLookupHalfStep;

		// Вектор от точки к источнику света
		vec2 toLight = vTextureCoord - lightPosition;

		// Пропорции
		toLight /= (max(viewResolution.x, viewResolution.y) / viewResolution);
		toLight /= lightSize;

		// Расстояние от точки до источника
		float light = length(toLight);
		// Угол от точки до источника (для координаты Х)
		float angleToPoint = atan(toLight.y, toLight.x);
		float angleCoordOnMap = angleToPoint / (2.0 * PI);

		vec2 samplePoint = vec2(angleCoordOnMap, yCoord);

		// Чем дальше от света -- тем больше размытия.
		float blur = smoothstep(0., 2., light*100.);

		// Наконец смотрим, есть ли тень от этого источника и на сколько она размыта в данной точке
		float sum = blurFn(shadowMapChannel, samplePoint, light, blur).a;
		sum = max(sum, lightColor.a);

		float angle = vTextureCoord.x * (2. * PI); // Угол для теста
		if (dot(normalize(lightDirection - lightPosition), -normalize(lightPosition - vTextureCoord)) < THETA)
			sum /= 50.;

		lightLuminosity = lightColor.rgb * vec3(sum) * (1. / pow(light*5., 1.8));

		// Прибавляем к общему освещению (в пикселе):
		color.rgb += lightLuminosity;
	}

	// Общее освещение
	color = max(color, uAmbient);

	// Пиксель который надо осветить
	vec4 base = texture2D(uSampler, vTextureCoord);

	// Освещаем умножением на корень из "освещенности" (по мне так красивее чем просто)
	gl_FragColor = vec4(base.rgb * sqrt(color.rgb), 1.0);
}
