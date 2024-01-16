// Шейдер для создания карты теней:

precision mediump float;

//Объявляем переданные uniform'ы
varying vec2 vTextureCoord; // Координата
uniform sampler2D uSampler; // Текстура на которую наложен фильтр (не используется)

uniform vec2 viewResolution; // Разрешение вьюшки
uniform vec2 rtSize; // Размер renderTarget

uniform vec4 uLightPosition[CONST_LIGHTS_COUNT]; //x,y = координаты, z = размер

uniform sampler2D uShadowCastersTexture; // Отсюда мы будем брать данные -- есть препятствие или нет.

const float PI = 3.14159265358979;
const float STEPS = 256.;
const float THRESHOLD = .999;

void main(void) {
	int lightnum = int(floor(vTextureCoord.y * float(CONST_LIGHTS_COUNT))); // Определяем номер источника света по Y
	vec2 lightPosition;
	vec2 lightDirection;
	float lightSize;
	for (int i = 0; i < CONST_LIGHTS_COUNT; i += 1) { // Определяем сам источник света по его номеру
		if (lightnum == i) {
			lightPosition = uLightPosition[i].xy / viewResolution;
			lightDirection = uLightPosition[i].zw / viewResolution;
			lightSize = 1000. / max(viewResolution.x, viewResolution.y);
			break;
		}
	}
	float dst = 1.; // Считаем что препятствий нет
	float angle = vTextureCoord.x * (2. * PI); // Угол для теста
	for (float y = 0.; y < STEPS; y += 1.) { // И мелкими (с мелкостью (y / STEPS)) шагами идем во всех направлениях
		float dist = (y / STEPS); // Расстояния для теста
		// По полярным координатам вычисляем пиксель для теста
		vec2 coord = vec2(cos(angle) * dist, sin(angle) * dist);
		coord *= (max(viewResolution.x, viewResolution.y) / viewResolution);  // Пропорции
		coord += lightPosition; // Прибавляем координаты источника
		coord = clamp(coord, 0., 1.); // Не выходим за пределы текстуры
		vec4 data = texture2D(uShadowCastersTexture, coord); // Находим пиксель
		if (data.a > THRESHOLD) { // Если есть препятствие, записываем расстояние и прекращаем поиск.
			dst = min(dst, dist);
			break;
		}
	}
	// if (dot(normalize(lightDirection - lightPosition), -normalize(lightPosition - vec2(cos(angle), sin(angle)))) < THETA)
		// dst = dst / (lightSize*2.);
	// else
		dst = dst / lightSize;
	// Дистанция получается в пикселях, сохраняем её в отрезке 0..1
	gl_FragColor = vec4(vec3(0.), dst);
}
