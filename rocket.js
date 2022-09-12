//initialize canvas
var can = document.getElementById("can");
var ctx = can.getContext("2d");

var width = 1200;
var height = 800;

can.width = width;
can.height = height;

ctx.font = "18px consolas";
ctx.textAlign = "center";
ctx.textBaseline = "top";

var interval = undefined;
var restarting = false;
var restartTime = 1000;

//The chance is random(0,chance), so for a 1/3 chance, the chance will be 2 (3-1)
var verySmallMutationChance = 99;
var smallMutationChance = 49;
var mediumMutationChance = 24;
var bigMutationChance = 3;
var randomMutationChance = 1;
//Change the number to have more or less rockets
var rocketNum = 50;
var alpha = 0.25;

var mouseX = 0;
var mouseY = 0;
var start = false;

var frame = 0;
//Change number to decide time allowed for the rocket to try
var frameMax = 500;
var round = 0;
var best = 999;
var bestRocket = -1;
var bestAll = 999;

//Change to true or false to make the rocket land necessary or not
var forceLand = false;

var controls = {
	up: 0,
	right: 0,
	left: 0,
	down: 0,
	r: 0,
	mouse: 0,
	space: 0,
}

var target = {
	x: 250,
	y: 80,
	radius: 10,
	color: "grey",
	borderRadius: 15,
	border: "red",
}

//template walls
var wallW = 50;
var wallH = 50;

function Wall(x, y) {
	this.x = x;
	this.y = y;
	this.w = wallW;
	this.h = wallH;

	this.draw = function () {
		ctx.fillStyle = "purple";
		ctx.fillRect(this.x, this.y, this.w, this.h);
	}
}

var walls = [];

//template rocket
var rocketW = 10;
var rocketH = 20;

function Rocket(x, y, inputs, control) {
	//position
	this.x = x;
	this.y = y;
	this.w = rocketW;
	this.h = rocketH;

	//drawing color
	this.color = "red";

	//angle
	this.angle = 0;

	//velocity/vitesse
	this.vX = 0;
	this.vY = 0;

	//movement variable
	this.turn = 4;
	this.force = 0.25;
	this.forceMax = 4;
	this.grav = 0.1;
	this.gravMax = wallH - 1;
	this.friction = 0.9;

	//fuel
	//Change number to allow more fuel for the rocket
	this.fuelMax = 240;
	this.fuel = this.fuelMax;

	//score and best
	this.score = 999;
	this.best = 999;

	//rocket state (dead or not)
	this.dead = false;
	this.land = false;
	this.moved = false;
	this.maxLandSpeed = this.forceMax;

	//inputs
	//0=none
	//1=left
	//2=right
	//3=up
	//4=left and up
	//5=right and up
	this.inputs = inputs;
	this.control = control;
	if (control == undefined) {
		this.control = false;
	}
	this.upHeld = false;

	this.move = function () {
		//inputs


		var input = this.inputs[frame];
		var left = 0;
		var right = 0;
		var up = 0;

		//add random input (0-5) to easy to read variables
		if (input == 1 || input == 4) {
			left = 1;
		}
		if (input == 2 || input == 5) {
			right = 1;
		}
		if (input == 3 || input == 4 || input == 5) {
			up = 1;
			this.upHeld = true;
		} else {
			this.upHeld = false;
		}

		if (control) {
			var newInput = 0;
			up = controls.up;
			left = controls.left;
			right = controls.right;

			if (up == 1) {
				this.upHeld = true;
				newInput = 3;
				if (left == 1) {
					newInput = 4;
				} else if (right == 1) {
					newInput = 5;
				}
			} else {
				this.upHeld = false;
				if (left == 1) {
					newInput = 1;
				} else if (right == 1) {
					newInput = 2;
				}
			}

			this.inputs[frame] = newInput;
		}

		if (up == 1) {
			this.moved = true;
		}


		if (left == 1) {
			this.angle -= this.turn;
		}
		if (right == 1) {
			this.angle += this.turn;
		}
		if (this.angle < 0) { this.angle = 359 + this.angle };
		if (this.angle > 359) { this.angle = this.angle - 359 };

		if (up == 1 && this.fuel > 0) {
			var forceX = Math.sin(this.angle * Math.PI / 180) * this.force;
			var forceY = -Math.cos(this.angle * Math.PI / 180) * this.force;
			this.vY += forceY;
			this.vX += forceX;
			this.fuel--;
		}

		//gravity
		this.vY += this.grav;
		if (this.vY > this.gravMax) {
			this.vY = this.gravMax;
		}

		//min and max vitesse
		if (this.vX < -this.forceMax) { this.vX = -this.forceMax; }
		if (this.vX > this.forceMax) { this.vX = this.forceMax; }

		if (this.vY < -this.forceMax) { this.vY = -this.forceMax; }

		//movement X
		this.x += this.vX;

		//collision X
		for (var i = 0; i < walls.length; i++) {
			if (col(this, walls[i])) {
				this.x -= this.vX;
				this.vX = 0;
				break;
			}
		}

		//movement Y
		this.y += this.vY;

		//collision Y
		for (var i = 0; i < walls.length; i++) {
			if (col(this, walls[i])) {
				this.y -= this.vY;
				this.vY = 0;
				break;
			}
		}

		//ground friction
		if (this.y >= height - this.h && (!forceLand || (forceLand && this.vY > this.grav))) {
			this.vX *= this.friction;

			//force angle on ground
			if (this.angle <= 315 && this.angle >= 180) {
				this.angle = 270;
				this.dead = true;
			}
			if (this.angle >= 45 && this.angle <= 180) {
				this.angle = 90;
				this.dead = true;
			}

			if (this.angle > 315 && this.angle <= 359) {
				this.angle = 0;
				if (this.vY < this.maxLandSpeed && this.vY > this.grav) {
					this.land = true;
				} else if (forceLand) {
					this.dead = true;
				}
			}
			if (this.angle < 45 && this.angle >= 0) {
				this.angle = 0;
				if (this.vY < this.maxLandSpeed && this.vY > this.grav) {
					this.land = true;
				} else if (forceLand) {
					this.dead = true;
				}
			}
		}

		if (this.y > height - this.h) {
			this.y = height - this.h;
			this.vY = 0;
		}

		if (this.y < 0) {
			this.y = 0;
			this.vY = -this.vY / 2;
		}
		if (this.x < this.w) {
			this.x = this.w;
			this.vX = -this.vX / 2;
		}
		if (this.x > width - this.w * 2) {
			this.x = width - this.w * 2;
			this.vX = this.vX / 2;
		}

		if (this.y >= height - this.h && this.fuel < this.fuelMax && this.vY > this.grav) {
			//idée brisé à Alex:  && !(rockets[0].angle==0 && rockets[0].fuel>0)
			rockets[i].dead = true;

		}

		if (!this.dead) {
			this.score = dist(this.x + this.w / 2, this.y + this.h / 2, target.x, target.y);
			if (this.best > this.score) {
				this.best = this.score;
			}
		}
	};

	this.draw = function () {
		rotate(this.x, this.y + this.h / 4, this.w, this.h, this.angle);
		var ratio = this.fuel / this.fuelMax;
		var g = 255 - ratio * 255;
		var b = 255 - ratio * 255;
		ctx.fillStyle = "rgba(255," + g + "," + b + "," + alpha + ")";

		if (this.control) {
			ctx.fillStyle = "lime";
		}

		ctx.fillRect(this.x, this.y, this.w, this.h);

		if (this.upHeld && this.fuel > 0) {
			ctx.fillStyle = "rgba(255,165,0," + alpha + ")";
			if (this.control) {
				ctx.fillStyle = "rgb(255,165,0)";
			}
			ctx.fillRect(this.x, this.y + this.h, this.w, this.w);
		}

		rotate(this.x, this.y + this.h / 4, this.w, this.h, -this.angle);
	};
}

var rockets = [];

function rotate(x, y, w, h, r) {
	ctx.translate(x + w / 2, y + h / 2);
	ctx.rotate(r * Math.PI / 180);
	ctx.translate(-x - w / 2, -y - h / 2);
}

function initialize() {
	clearInterval(interval);
	interval = setInterval(update, 1000 / 30);
	round = -1;
	restart(true);
}

function restart(init) {
	round++;

	var bestInputs = undefined;
	var smallMutation = undefined;
	var bigMutation = undefined;
	if (bestRocket != -1) {
		//copy best rocket
		bestInputs = rockets[bestRocket].inputs.slice();
	}
	if (init) {
		bestInputs = undefined;
	}

	//delete rockets
	rockets = [];
	//create rockets
	for (var i = 0; i < rocketNum; i++) {
		var actualInputs = [];
		var ran = random(rocketW, width - rocketW);
		ran = width / 2 - rocketW;

		if (bestInputs === undefined) {
			for (var j = 0; j < frameMax; j++) {
				actualInputs.push(random(0, 5));
			}
		} else {
			if (i == 0) {
				actualInputs = bestInputs.slice();
			} else if (i == 1 || i == 2 || (best < wallW / 2 && i % 4 == 2)) {
				//Very small mutation
				actualInputs = [];
				for (var j in bestInputs) {
					if (random(0, verySmallMutationChance) == 0) {
						actualInputs.push(random(0, 5));
					} else {
						actualInputs.push(bestInputs[j]);
					}
				}
			} else if (i % 4 == 0) {
				//Small mutation
				actualInputs = [];
				for (var j in bestInputs) {
					if (random(0, smallMutationChance) == 0) {
						actualInputs.push(random(0, 5));
					} else {
						actualInputs.push(bestInputs[j]);
					}
				}
			} else if (i % 4 == 1) {
				//Medium mutation
				actualInputs = [];
				for (var j in bestInputs) {
					if (random(0, mediumMutationChance) == 0) {
						actualInputs.push(random(0, 5));
					} else {
						actualInputs.push(bestInputs[j]);
					}
				}
			} else if (i % 4 == 2) {
				//Big mutation
				actualInputs = [];
				for (var j in bestInputs) {
					if (random(0, bigMutationChance) == 0) {
						actualInputs.push(random(0, 5));
					} else {
						actualInputs.push(bestInputs[j]);
					}
				}
			} else {
				//Random ending mutation
				actualInputs = [];
				for (var j in bestInputs) {
					if (j >= bestInputs.length / 2 && random(0, randomMutationChance) == 0) {
						actualInputs.push(random(0, 5));
					} else {
						actualInputs.push(bestInputs[j]);
					}
				}
			}
		}

		if (i == rocketNum - 1) {
			rockets.push(new Rocket(ran, height - rocketH, actualInputs, true));
		} else {
			rockets.push(new Rocket(ran, height - rocketH, actualInputs));
		}
	}

	best = 999;
	bestInputs = undefined;
	bestRocket = -1;
	frame = 0;
	restarting = false;
}

function update() {
	if (start) {
		//update
		if (controls.r == 1) {
			controls.r = 0;
			round--;
			restart();
		}

		//move rockets
		if (!restarting) {
			for (var i in rockets) {
				if (!rockets[i].dead && !rockets[i].land) {
					rockets[i].move();
				}
			}
		}

		//check if rockets are all dead
		if (!restarting && frame > 50) {
			var deadNum = 0;
			for (var i in rockets) {
				if (rockets[i].dead || frame >= frameMax) {
					deadNum++;
				} else {
					//update best score
					if (best > rockets[i].best && (!forceLand || (forceLand && rockets[i].land)) && rockets[i].moved) {
						best = rockets[i].best;
						bestRocket = i;
					}
				}
			}
			if (deadNum == rockets.length) {
				restarting = true;
				setTimeout(restart, restartTime);

				//update best of all rounds
				if (bestAll > best) {
					bestAll = best;
				}
			}
		}

		//draw
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, width, height);


		//draw walls
		for (var i in walls) {
			walls[i].draw();
		}

		//target circle
		ctx.fillStyle = target.color;
		ctx.beginPath();
		ctx.arc(target.x, target.y, target.radius, 0, 2 * Math.PI, false);
		ctx.fill();

		//draw rockets
		for (var i in rockets) {
			rockets[i].draw();
		}

		var mine = (rockets[rocketNum - 1].best).toFixed(4);

		//title
		ctx.fillStyle = "white";
		ctx.fillText("Round: " + round + " | Best: " + best.toFixed(4) + "/" + mine + " | Best of all: " + bestAll.toFixed(4), width / 2, 5);

		frame++;
		if (frame > frameMax) {
			frame = frameMax;
		}
	} else {
		//not started
		if (controls.mouse == 1) {
			controls.mouse = 0;
			target.x = mouseX;
			target.y = mouseY;
		}

		if (controls.space == 1) {
			controls.space = 0;
			walls.push(new Wall(mouseX - wallW / 2, mouseY - wallH / 2));
		}

		if (controls.r == 1) {
			start = true;
			controls.r = 0;
		}

		//draw
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, width, height);

		//draw walls
		for (var i in walls) {
			walls[i].draw();
		}

		//title
		ctx.fillStyle = "white";
		ctx.fillText("Put the target by click, use space to add obstacle and press R to start", width / 2, 5);

		//target circle
		ctx.fillStyle = target.color;
		ctx.beginPath();
		ctx.arc(target.x, target.y, target.radius, 0, 2 * Math.PI, false);
		ctx.fill();

	}

}

initialize();

document.addEventListener("keydown", function (e) {
	if (e.keyCode == 37) { controls.left = 1; }
	if (e.keyCode == 38) { controls.up = 1; }
	if (e.keyCode == 39) { controls.right = 1; }
	if (e.keyCode == 40) { controls.down = 1; }
	if (e.keyCode == 82) { controls.r = 1; }
	if (e.keyCode == 32) { controls.space = 1; }
});

document.addEventListener("keyup", function (e) {
	if (e.keyCode == 37) { controls.left = 0; }
	if (e.keyCode == 38) { controls.up = 0; }
	if (e.keyCode == 39) { controls.right = 0; }
	if (e.keyCode == 40) { controls.down = 0; }
	if (e.keyCode == 82) { controls.r = 0; }
	if (e.keyCode == 32) { controls.space = 0; }
});

document.addEventListener("mousemove", function (evt) {
	var rect = can.getBoundingClientRect();

	mouseX = Math.round(((evt.clientX - rect.left) / (rect.right - rect.left)) * width);
	mouseY = Math.round(((evt.clientY - rect.top) / (rect.bottom - rect.top)) * height);
});

document.addEventListener("mousedown", function (evt) {
	controls.mouse = 1;
});

document.addEventListener("mouseup", function (evt) {
	controls.mouse = 0;
});


function random(min, max) {
	//smaller variable = more possibilites
	num = Math.floor(Math.random() * (max - min + 1) + min);
	return num;
};

function dist(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}

function col(rect1, rect2) {
	var col = false;
	if (rect1.x < rect2.x + rect2.w &&
		rect1.x + rect1.w > rect2.x &&
		rect1.y < rect2.y + rect2.h &&
		rect1.h + rect1.y > rect2.y) {
		col = true;
	}
	return col;
}