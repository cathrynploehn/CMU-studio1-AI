
	var myRec = new p5.SpeechRec(); // new P5.SpeechRec object
	var counselor = new p5.Speech(); // speech synthesis object

	myRec.continuous = true; // do continuous recognition
	myRec.interimResults = false; // allow partial recognition (faster, less accurate)

	var aiSpeaking = false;
	
	var transcript = {};
	var check = "";
	var currentLine = 0;

	var segments = [];
	var pathGenerated;
	var segmentWidth;
	var destination;
	var origin;
	var dest;


	function parseResult() {
		var mostrecentword = myRec.resultString;
		if (check != mostrecentword) {
			console.log(mostrecentword);
			if (mostrecentword.indexOf(transcript[currentLine].trigger) !== -1) {
				respond();
			}
		}
		check = mostrecentword;	
	}

	function respond (){
		aiSpeaking = true;
		counselor.speak(transcript[currentLine].response);	
		updateLine();		
		currentLine = currentLine < transcript.length - 1? currentLine + 1 : currentLine;
	}
  
  window.onload = async function() {
  		mic = new p5.AudioIn()
  		mic.start();

  		// noCanvas();
		myRec.onResult = parseResult; // recognition callback
		myRec.onError = function(){
			console.log("error");
			// myRec.start();
		};
		amplitude = new p5.Amplitude();

		// Read in triggers and responses
		transcript = await d3.csv("transcript.csv");
		counselor.setVoice("Google UK English Female");
		aiSpeaking = true;
		counselor.speak(transcript[currentLine].response);
		currentLine++;
		counselor.onEnd = function(){
			// myRec.start(); // start engine
			aiSpeaking   = false;
		};
		myRec.start();

  		var canvas = document.getElementById('leCanvas');
		// Create an empty project and a view for the canvas:
		paper.setup(canvas);
		var rect = new paper.Path.Rectangle({
		    point: [0, 0],
		    size: [paper.view.size.width, paper.view.size.height],
		    strokeColor: '#000000',
		    fillColor: '#030303',
		    selected: false
		});
		rect.sendToBack();

		var speakerGradient = new paper.Path.Rectangle({
		    point: [0, 0],
		    size: [paper.view.size.width, paper.view.size.height],
		    fillColor: {
			    gradient: {
			        stops: [['rgba(200, 200, 200, 1)', 1],['rgba(0,0,0,0)', .5]]
			    },
			    radial: true,
			    origin: new paper.Point(paper.view.size.width/2, 0),
			    destination: new paper.Point(paper.view.size.width/2, paper.view.size.height)
			},
		    selected: false
		});

		var aiGradient = new paper.Path.Rectangle({
		    point: [0, 0],
		    size: [paper.view.size.width, paper.view.size.height],
		    fillColor: {
			    gradient: {
			        stops: [['rgba(200, 200, 200, 1)', 1],['rgba(0,0,0,0)', .5]]
			    },
			    radial: true,
			    origin: new paper.Point(paper.view.size.width/2, paper.view.size.height),
			    destination: new paper.Point(paper.view.size.width/2, 0)
			},
		    selected: false
		});

		
		function drawLine(){
			var numSegs = transcript.length;
			var width = paper.view.size.width/2;
			var lineData = [{x: 0, y:0}];

			var i = 0;
			while( i < ((numSegs) * 2)){
				var empty1 = drawEmptySegment(i);
				i++;
				var segs = drawSegment(i);
				i++;
				lineData = lineData.concat(empty1);
				lineData = lineData.concat(segs);
			}
			var empty3 = drawEmptySegment(i+2);
			lineData = lineData.concat(empty3);
			console.log(lineData);

				var tension = 0;
			function drawSegment(i) {
				var waveLength = width / 7;
				var height = 30;
				var vNoise = 5;
				var hNoise = 5;
				
				var numDots = Math.floor(width/waveLength - 2);
				var j = i;
				// Generate data
				var segment = d3.range(numDots).map(function(item, index) {
					var x = index * waveLength + (width * j);
					if(index == 0||index == (numDots-1)){
						y = 0;
					} else {
						var neg = index % 2? 1: -1;
						y = ((index % 2) + 1) * height * ((Math.random() * vNoise) * neg);
						x += ((Math.random() * hNoise) * i)
					}
					return {
						x:x,
						y:y 
					};
				});

				return segment;
				
			}

			function drawEmptySegment(i){
				var output = {x: i * width, y: 0 };
				console.log(output);
				return {x: i * width, y: 0 };
			}

			var lineGenerator = d3.line()
				.x(function(data, index){return data.x;})
				.y(function(data, index){return data.y;})
				.curve(d3.curveCardinal.tension(tension));

			pathGenerated = new paper.Path(lineGenerator(lineData));
			segmentWidth = pathGenerated.bounds.width / (numSegs+1);
			
			var origin = new paper.Point(pathGenerated.bounds.leftCenter.x, paper.view.size.height/2);
			var destination = new paper.Point((pathGenerated.bounds.width/(numSegs + 1)), paper.view.size.height/2);
			
			pathGenerated.strokeWidth = 5;
			pathGenerated.strokeColor = {
			    gradient: {
			        stops: [['rgba(0,0,0,0)', 0], ['white', .45],['rgba(0,0,0,0)', .47]]
			    },
			    radial: true,
			    origin: origin,
			    destination: destination
			};
			// pathGenerated.strokeColor = "white";
			pathGenerated.position = 
					new paper.Point((pathGenerated.bounds.width/2), paper.view.size.height/2);
		}

		drawLine();
		destination = pathGenerated.position.x;
		origin =  pathGenerated.strokeColor.origin.x;
		dest = pathGenerated.strokeColor.destination.x;
		console.log(speakerGradient.fillColor.gradient.stops[0].color.alpha);

		paper.view.onFrame = function(event) {
			var level = mic.getLevel();
			if(aiSpeaking){
				speakerGradient.fillColor.gradient.stops[0].color.alpha = 0; 
				aiGradient.fillColor.gradient.stops[0].color.alpha = (level * .25);
			} else {
				speakerGradient.fillColor.gradient.stops[0].color.alpha = (level * .25); 
				aiGradient.fillColor.gradient.stops[0].color.alpha = 0;
			}
			
			if(pathGenerated){
				var vector = destination - pathGenerated.position.x;
				var vectorOrigin =  origin - pathGenerated.strokeColor.origin.x;
				var vectorDest = dest - pathGenerated.strokeColor.destination.x;
				var vectorAmp = level - speakerGradient.fillColor.gradient.stops[0].color.alpha;

				pathGenerated.position.x += vector / 120;  
				pathGenerated.strokeColor.origin.x += vectorOrigin / 4;
				pathGenerated.strokeColor.destination.x += vectorDest / 4;

			}

		}
  }

  function updateLine(){
  	destination = destination - ((segmentWidth));
	origin =  origin + ((segmentWidth)/128);
	dest = dest + ((segmentWidth)/128);
  }

	window.addEventListener("click", function(event) {
		respond();
	});
  
