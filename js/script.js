(function () {
	var R_WIDTH = 1080;
	var R_HEIGHT = 1080;
	var WIDTH = 1080;
	var HEIGHT = 1080;
	var BORDER = 8;
	var ROOMS = 20;
	var ROOMW = R_WIDTH/ROOMS;
	var ROOMH = R_HEIGHT/ROOMS;
	var renderer = new PIXI.WebGLRenderer(R_WIDTH, R_HEIGHT);
	var mouse = [];
	var keys = {};
	var touches = [];
	var mazeSeed = Math.floor(Math.random()*1000);
	var mazeSrc = '';
	var mazeMap;
	var mazeComplete;
	document.title = 'Maze #' + mazeSeed;

	document.addEventListener("DOMContentLoaded", function (event) {
		document.body.appendChild(renderer.view);
		renderer.view.setAttribute('style', 'width: 100vmin; height: 100vmin');

		PIXI.loader
			.add('glslShadowTexture', 'glsl/smap-shadow-texture.frag')
			.add('glslShadowCast', 'glsl/smap-shadow-cast.frag')
			.once('complete', setup)
			.load();

		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		// svg.setAttribute('style', `background-color: white; stroke: black; stroke-width: ${BORDER}; stroke-linecap: round`);
		svg.setAttribute('style', `stroke: black; stroke-width: ${BORDER}; stroke-linecap: round`);
		// svg.setAttribute('viewBox', `${-BORDER/2} ${-BORDER/2} ${WIDTH+BORDER} ${HEIGHT+BORDER}`);
		svg.setAttribute('width', WIDTH);
		svg.setAttribute('height', HEIGHT);

		mazeMap = maze(ROOMS, ROOMS);
		var textMap = display(mazeMap, svg, WIDTH/ROOMS);

		var s = new XMLSerializer().serializeToString(svg);
		var img = document.createElement('img');
		mazeSrc = `data:image/svg+xml;base64,${btoa(s)}`;
		img.setAttribute('src', mazeSrc);
		// document.body.appendChild(img);

		// renderer.view.addEventListener("mousemove", (event) => {
			// mouse[0] = event.clientX * renderer.view.scrollX/R_WIDTH;
			// mouse[1] = event.clientY * renderer.view.scrollY/R_HEIGHT;
		// });
		document.addEventListener("keydown", (event) => {
			if (![37,38,39,40,65,68,83,87].includes(event.keyCode)) return;
			keys[event.keyCode] = true;
		});
		document.addEventListener("keyup", (event) => {
			if (![37,38,39,40,65,68,83,87].includes(event.keyCode)) return;
			keys[event.keyCode] = false;
		});
		document.addEventListener("touchstart", (event) => {
			for (let i = 0; i < event.changedTouches.length; i++) {
				var touch = event.changedTouches[i];
				touches[touch.identifier] = [touch.pageX, touch.pageY, 0, 0];
			}
		});
		document.addEventListener("touchmove", (event) => {
			for (let i = 0; i < event.changedTouches.length; i++) {
				var touch = event.changedTouches[i];
				touches[touch.identifier][2] = touch.pageX - touches[touch.identifier][0];
				touches[touch.identifier][3] = touch.pageY - touches[touch.identifier][1];
			}
		});
		document.addEventListener("touchend", (event) => {
			for (let i = 0; i < event.changedTouches.length; i++) {
				var touch = event.changedTouches[i];
				touches[touch.identifier] = null;
			}
		});
		document.addEventListener("touchcancel", (event) => {
			for (let i = 0; i < event.changedTouches.length; i++) {
				var touch = event.changedTouches[i];
				touches[touch.identifier] = null;
			}
		});
	});

	function setup() {
		var lights = [];
		lights[0] = new PIXI.Graphics();
		lights[0].r = 10;
		lights[0].g = 128;
		lights[0].b = 255;
		lights[0].beginFill(lights[0].r << 16 | lights[0].g << 8 | lights[0].b);
		lights[0].drawCircle(0, 0, BORDER/2); // x, y, radius
		lights[0].x = ROOMW/2; // = lights[0].x2 = lights[0].xt
		lights[0].y = ROOMH/2;
		lights[1] = new PIXI.Graphics();
		lights[1].r = 255;
		lights[1].g = 128;
		lights[1].b = 10;
		lights[1].beginFill(lights[1].r << 16 | lights[1].g << 8 | lights[1].b);
		lights[1].drawCircle(0, 0, BORDER/2);
		lights[1].x = lights[1].x0 = R_WIDTH - ROOMW/2;
		lights[1].y = lights[1].y0 = R_HEIGHT - ROOMH/2;
		var background = new PIXI.Graphics();
		background.beginFill(0x999999);
		background.drawRect(0, 0, R_WIDTH, R_HEIGHT); // x, y, width, height
		var path = new PIXI.Graphics();
		path.lineStyle(ROOMW - BORDER, 0x00E000, .5);
		path.moveTo(lights[1].x0, lights[1].y0);
		path.lineTo(lights[1].x0, lights[0].y);
		path.lineTo(lights[0].x, lights[0].y);

		var img = new Image();
		img.src = mazeSrc;
		var myBaseTexture = new PIXI.BaseTexture(img);
		var texture = new PIXI.Texture(myBaseTexture);
		PIXI.Texture.addTextureToCache(texture, "maze");
		var shadowCastImage = PIXI.Sprite.fromImage("maze");

		var shadowCasters = new PIXI.Container();
		shadowCasters.addChild(shadowCastImage);
		// shadowCasters.addChild(lights[1]);

		var lightingRT = new PIXI.RenderTexture(renderer, R_WIDTH, R_HEIGHT);
		var lightingSprite = new PIXI.Sprite(lightingRT);
		var filter = createSMapFilter();
		lightingSprite.filters = [filter];

		var stage = new PIXI.Container();
		stage.addChild(background);
		stage.addChild(lightingSprite);
		stage.addChild(path);
		stage.addChild(shadowCasters);
		stage.addChild(lights[0]);
		stage.addChild(lights[1]);

		(function animate() {
			renderer.width = document.body.scrollWidth;
			lightingRT.width = document.body.scrollWidth;

			var xm = 0.;
			var ym = 0.;
			if (keys[37] || keys[65]) xm -= 2.;
			if (keys[39] || keys[68]) xm += 2.;
			if (keys[38] || keys[87]) ym -= 2.;
			if (keys[40] || keys[83]) ym += 2.;
			if (touches[0]) {
				xm += touches[0][2]/50.;
				ym += touches[0][3]/50.;
				// mouse[0] = lights[0].x + xm*20;
				// mouse[1] = lights[0].y + ym*20;
			}
			xm = Math.max(-2., Math.min(xm, 2.));
			ym = Math.max(-2., Math.min(ym, 2.));
			var xi = Math.floor(lights[0].x/ROOMW);
			var yi = Math.floor(lights[0].y/ROOMH);
			if (xi == ROOMS-1 && yi == ROOMS-1) {
				mazeComplete = true;
				lights[1].r = lights[1].g = lights[1].b = 0;
				lights[1].clear();
				mazeMap.path = {};
				// while (true) {
					// mazeMap.horiz[]
				// }
				// path.lineTo(lights[0].x, lights[0].y);
			}
			var edgel = (xi <= 0 || !mazeMap.horiz[yi][xi-1]);
			var edger = (xi >= mazeMap.horiz.length || !mazeMap.horiz[yi][xi]);
			var edget = (yi <= 0 || !mazeMap.verti[yi-1][xi]);
			var edgeb = (yi >= mazeMap.verti.length || !mazeMap.verti[yi][xi]);
			lights[0].x += xm;
			lights[0].y += ym;
			var xc = (xi + .5)*ROOMW;
			var yc = (yi + .5)*ROOMH;
			if (edgel) lights[0].x = Math.max(lights[0].x, xc - ROOMW/2 + BORDER);
			if (edger) lights[0].x = Math.min(lights[0].x, xc + ROOMW/2 - BORDER);
			if (edget) lights[0].y = Math.max(lights[0].y, yc - ROOMH/2 + BORDER);
			if (edgeb) lights[0].y = Math.min(lights[0].y, yc + ROOMH/2 - BORDER);
			var cornlt = Math.hypot(lights[0].x - (xc - ROOMW/2), lights[0].y - (yc - ROOMH/2));
			var cornrt = Math.hypot(lights[0].x - (xc + ROOMW/2), lights[0].y - (yc - ROOMH/2));
			var cornlb = Math.hypot(lights[0].x - (xc - ROOMW/2), lights[0].y - (yc + ROOMH/2));
			var cornrb = Math.hypot(lights[0].x - (xc + ROOMW/2), lights[0].y - (yc + ROOMH/2));
			if (cornlt < BORDER) {
				lights[0].x = xc - ROOMW/2 + (lights[0].x - (xc - ROOMW/2))/cornlt*BORDER;
				lights[0].y = yc - ROOMH/2 + (lights[0].y - (yc - ROOMH/2))/cornlt*BORDER;
			}
			if (cornrt < BORDER) {
				lights[0].x = xc + ROOMW/2 + (lights[0].x - (xc + ROOMW/2))/cornrt*BORDER;
				lights[0].y = yc - ROOMH/2 + (lights[0].y - (yc - ROOMH/2))/cornrt*BORDER;
			}
			if (cornlb < BORDER) {
				lights[0].x = xc - ROOMW/2 + (lights[0].x - (xc - ROOMW/2))/cornlb*BORDER;
				lights[0].y = yc + ROOMH/2 + (lights[0].y - (yc + ROOMH/2))/cornlb*BORDER;
			}
			if (cornrb < BORDER) {
				lights[0].x = xc + ROOMW/2 + (lights[0].x - (xc + ROOMW/2))/cornrb*BORDER;
				lights[0].y = yc + ROOMH/2 + (lights[0].y - (yc + ROOMH/2))/cornrb*BORDER;
			}
			var away = (R_WIDTH + R_HEIGHT)/4 - Math.hypot(lights[1].x0 - lights[0].x, lights[1].y0 - lights[0].y);
			if (!mazeComplete && away > 0) {
				lights[1].x = lights[1].x0 - Math.sin(performance.now()/100.)*away/50.;
				lights[1].y = lights[1].y0 - Math.cos(performance.now()/100.)*away/50.;
			}
			// if (xi0 != xi || yi0 != yi) {
				// console.log(
					// '+'   + edget + '+'   + '\n' +
					// edgel + '   ' + edger + '\n' +
					// '+'   + edgeb + '+'
				// );
			// }
			// lights[0].x2 = mouse[0] || lights[0].xt;
			// lights[0].y2 = mouse[1] || lights[0].yt;
			// lights[0].xt += (lights[0].x2 - lights[0].xt)/4;
			// lights[0].yt += (lights[0].y2 - lights[0].yt)/4;
			// if (renderer.plugins.interaction.mouse.originalEvent?.which === 1) {
				// lights[0].x += (pointer.x - lights[0].x)/4;
				// lights[0].y += (pointer.y - lights[0].y)/4;
			// }

			// filter.uniforms[`uAmbient`].value[1] = mazeComplete ? 1. : .0;
			for (var i = 0; i < lights.length; ++i) {
				filter.uniforms[`uLightPosition[${i}]`].value[0] = lights[i].x;
				filter.uniforms[`uLightPosition[${i}]`].value[1] = lights[i].y;
				filter.uniforms[`uLightPosition[${i}]`].value[2] = lights[i].xt;
				filter.uniforms[`uLightPosition[${i}]`].value[3] = lights[i].yt;
				filter.uniforms[`uLightColor[${i}]`].value[0] = lights[i].r/255.;
				filter.uniforms[`uLightColor[${i}]`].value[1] = lights[i].g/255.;
				filter.uniforms[`uLightColor[${i}]`].value[2] = lights[i].b/255.;
			}

			filter.render(shadowCasters);

			lightingRT.render(stage);

			renderer.render(stage);

			requestAnimationFrame(animate);
		})();
	}

	function createSMapFilter() {
		var CONST_LIGHTS_COUNT = 2;
		var SMapFilter = new PIXI.AbstractFilter(null, null, {
			viewResolution: {type: '2fv', value: [R_WIDTH, R_HEIGHT]}
			, rtSize: {type: '2fv', value: [1024, CONST_LIGHTS_COUNT]}
			, uAmbient: {type: '4fv', value: [.0, .0, .0, .0]}
		});
		for (var i = 0; i < CONST_LIGHTS_COUNT; ++i) {
			SMapFilter.uniforms['uLightPosition[' + i + ']'] = {type: '4fv', value: [0, 0, 0, 0]}; // х, у, размер в пикселях и "falloff" уровень падения освещенности
			SMapFilter.uniforms['uLightColor[' + i + ']'] = {type: '4fv', value: [0, 0, 0, 0]}; // r, g, b, и эмбиент освещение для конкретного источника света.
		}

		SMapFilter.renderTarget = new PIXI.RenderTarget(
			renderer.gl
			, SMapFilter.uniforms.rtSize.value[0]
			, SMapFilter.uniforms.rtSize.value[1]
			, PIXI.SCALE_MODES.LINEAR
			, 1);
		SMapFilter.renderTarget.transform = new PIXI.Matrix()
			.scale(SMapFilter.uniforms.rtSize.value[0] / R_WIDTH
				, SMapFilter.uniforms.rtSize.value[1] / R_HEIGHT);

		SMapFilter.shadowCastersRT = new PIXI.RenderTexture(renderer, R_WIDTH, R_HEIGHT);
		SMapFilter.uniforms.uShadowCastersTexture = {
			type: 'sampler2D',
			value: SMapFilter.shadowCastersRT
		};
		SMapFilter.render = function (group) {
			SMapFilter.shadowCastersRT.render(group, null, true);
		};

		SMapFilter.testFilter = new PIXI.AbstractFilter(null, "precision highp float;"
			+ "varying vec2 vTextureCoord;"
			+ "uniform sampler2D uSampler;"
			+ "void main(void) {gl_FragColor = texture2D(uSampler, vTextureCoord);}");

		var filterShadowTextureSource = PIXI.loader.resources.glslShadowTexture.data;
		filterShadowTextureSource = filterShadowTextureSource.replace(/CONST_LIGHTS_COUNT/g, CONST_LIGHTS_COUNT);

		var filterShadowTextureUniforms = Object.keys(SMapFilter.uniforms).reduce(function (c, k) {
			c[k] = {
				type: SMapFilter.uniforms[k].type
				, value: SMapFilter.uniforms[k].value
			};
			return c;
		}, {});
		SMapFilter.filterShadowTexture = new PIXI.AbstractFilter(
			null
			, filterShadowTextureSource
			, filterShadowTextureUniforms
		);

		var filterShadowCastUniforms = Object.keys(SMapFilter.uniforms).reduce(function (c, k) {
			c[k] = {
				type: SMapFilter.uniforms[k].type
				, value: SMapFilter.uniforms[k].value
			};
			return c;
		}, {});
		filterShadowCastUniforms.shadowMapChannel = {
			type: 'sampler2D',
			value: {
				baseTexture: {
					hasLoaded: true
					, _glTextures: [SMapFilter.renderTarget.texture]
				}
			}
		};
		SMapFilter.filterShadowCast = new PIXI.AbstractFilter(
			null
			, PIXI.loader.resources.glslShadowCast.data.replace(/CONST_LIGHTS_COUNT/g, CONST_LIGHTS_COUNT)
			, filterShadowCastUniforms
		);

		SMapFilter.applyFilter = function (renderer, input, output) {
			SMapFilter.filterShadowTexture.applyFilter(renderer, input, SMapFilter.renderTarget, true);
			// SMapFilter.testFilter.applyFilter(renderer, SMapFilter.renderTarget, output);
			SMapFilter.filterShadowCast.applyFilter(renderer, input, output);
		};
		return SMapFilter;
	}

	function maze(x, y) {
		var n = x*y-1;
		if (n < 0) { alert("illegal maze dimensions"); return; }
		var horiz = []; for (var j = 0; j < x+1; j++) horiz[j] = [],
			verti = []; for (var j = 0; j < x+1; j++) verti[j] = [],
			here = [Math.floor(mulberry32(mazeSeed++)*x), Math.floor(mulberry32(mazeSeed++)*y)],
			path = [here],
			unvisited = [];
		for (var j = 0; j < x+2; j++) {
			unvisited[j] = [];
			for (var k = 0; k < y+1; k++)
				unvisited[j].push(j > 0 && j < x+1 && k > 0 && (j != here[0]+1 || k != here[1]+1));
		}
		while (0 < n) {
			var potential = [
				[here[0]+1, here[1]], [here[0], here[1]+1],
				[here[0]-1, here[1]], [here[0], here[1]-1]
			];
			var neighbors = [];
			for (var j = 0; j < 4; j++)
				if (unvisited[potential[j][0]+1][potential[j][1]+1])
					neighbors.push(potential[j]);
			if (neighbors.length) {
				n = n-1;
				next = neighbors[Math.floor(mulberry32(mazeSeed++)*neighbors.length)];
				unvisited[next[0]+1][next[1]+1] = false;
				if (next[0] == here[0])
					horiz[next[0]][(next[1]+here[1]-1)/2] = true;
				else 
					verti[(next[0]+here[0]-1)/2][next[1]] = true;
				path.push(here = next);
			} else 
				here = path.pop();
		}
		return {x: x, y: y, horiz: horiz, verti: verti};
	}

	function display(m, svg, step) {
		var text = [];
		for (var j = 0; j < m.x*2+1; j++) {
			var line = [];
			if (0 == j%2) {
				for (var k = 0; k < m.y*2+1; k++) {
					if (0 == k%2) {
						line[k] = '+';
					} else {
						if (j > 0 && m.verti[j/2-1][Math.floor(k/2)]) {
							line[k] = '0';
						} else {
							line[k] = '-';
						}
					}
				}
			} else {
				for (var k = 0; k < m.y*2+1; k++) {
					if (0 == k%2) {
						if (k > 0 && m.horiz[(j-1)/2][k/2-1]) {
							line[k] = ' ';
						} else {
							line[k] = '|';
						}
					} else {
						line[k] = '0';
					}
				}
			}
			line.forEach((s, i) => {
				if (s == '-' || s == '|') {
					var elem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
					if (s == '-') {
						elem.setAttributeNS(null, 'x1', (i-1)*step/2);
						elem.setAttributeNS(null, 'y1', j*step/2);
						elem.setAttributeNS(null, 'x2', (i+1)*step/2);
						elem.setAttributeNS(null, 'y2', j*step/2);
					} else {
						elem.setAttributeNS(null, 'x1', i*step/2);
						elem.setAttributeNS(null, 'y1', (j-1)*step/2);
						elem.setAttributeNS(null, 'x2', i*step/2);
						elem.setAttributeNS(null, 'y2', (j+1)*step/2);
					}
					svg.appendChild(elem);
				}
			});
			text.push(line.join('') + '\r\n');
		}
		return text.join('');//.replaceAll('-', '---').replaceAll('0', '   ');
	}

	function mulberry32(a) {
		var t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
})();
