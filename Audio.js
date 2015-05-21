 var AudioClass=function(){

	var waveData = []; //waveform - from 0 - 1 . no sound is 0.5. Array [binCount]
	var levelsData = []; //levels of each frequecy - from 0 - 1 . no sound is 0. Array [levelsCount]
	var level = 0; // averaged normalized level from 0 - 1
	var bpmTime = 0; // bpmTime ranges from 0 to 1. 0 = on beat. Based on tap bpm
	var ratedBPMTime = 550;//time between beats (msec) multiplied by BPMRate
	var levelHistory = []; //last 256 ave norm levels
	var bpmStart; 

	 
	var BEAT_HOLD_TIME = 40; //num of frames to hold a beat
	var BEAT_DECAY_RATE = 0.98;
	var BEAT_MIN = 0.15; //a volume less than this is no beat

	//BPM STUFF
	var count = 0;
	var msecsFirst = 0;
	var msecsPrevious = 0;
	var msecsAvg = 633; //time between beats (msec)
	
	var timer;
	var gotBeat = false;
	var beatCutOff = 0.0;
	var beatTime = 0;

	var debugCtx;
	var debugW = 330;
	var debugH = 250;
	var chartW = 300;
	var chartH = 250;
	var aveBarWidth = 30;
	var debugSpacing = 2;
	var gradient;

	var freqByteData; //bars - bar data is from 0 - 256 in 512 bins. no sound is 0;
	var timeByteData; //waveform - waveform data is from 0-256 for 512 bins. no sound is 128.
	var levelsCount = 16; //should be factor of 512
	
	var binCount; //512
	var levelBins;

	var isPlayingAudio = false;

	var source;
	var buffer;
	var audioBuffer;
	var dropArea;
	var audioContext;
	var analyser;
	//var sample = 'http://api.soundcloud.com/tracks/206437193/stream';//'http://api.soundcloud.com/tracks/204082098/stream';
	var sample = 'http://abhishekbhunia.github.io/NoisyPlanet/sample2.mp3';
	function init() { 

		audioContext = new AudioContext();
		analyser = audioContext.createAnalyser();
		analyser.smoothingTimeConstant = 0.8; //0<->1. 0 is no time smoothing
		analyser.fftSize = 1024;
		analyser.connect(audioContext.destination);
		binCount = analyser.frequencyBinCount; // = 512

		levelBins = Math.floor(binCount / levelsCount); //number of bins in each level

		freqByteData = new Uint8Array(binCount); 
		timeByteData = new Uint8Array(binCount);

		var length = 256;
		for(var i = 0; i < length; i++) {
		    levelHistory.push(0);
		}	 

	}

	function initSound(){
		source = audioContext.createBufferSource();
		source.connect(analyser);
	}
	 
	function loadSampleAudio() {

		stopSound();

		initSound();

		//var url = new URL(sample+ '?client_id=ac7f41a52aa7212a8ecac89b46801a05');//679877a8ddb9badc6a2a75373c5f3de7
		var url=new URL(sample);
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";
		request.onload = function() {

			audioContext.decodeAudioData(request.response, function(buffer) {
				audioBuffer = buffer;
				startSound();
			}, function(e) {
				console.log(e);
			});
		};
		request.send();
	}

	function onTogglePlay(){

		if (Controls.audioParams.play){
			startSound();
		}else{
			stopSound();
		}
	}

	function startSound() {
		source.buffer = audioBuffer;
		source.loop = true;
		source.start(0.0);
		isPlayingAudio = true;

	}

	function stopSound(){
		isPlayingAudio = false;
		if (source) {
			source.stop(0);
			source.disconnect();
		}
		 
	}

	 
	function onUseSample(){
		if (Controls.audioParams.useSample){
			loadSampleAudio();          
			Controls.audioParams.useMic = false;
		}else{
			stopSound();
		}
	}
 
	function onMP3Drop(evt) {

		//TODO - uncheck mic and sample in CP

		Controls.audioParams.useSample = false;
		Controls.audioParams.useMic = false;

		stopSound();

		initSound();

		var droppedFiles = evt.dataTransfer.files;
		var reader = new FileReader();
		reader.onload = function(fileEvent) {
			var data = fileEvent.target.result;
			onDroppedMP3Loaded(data);
		};
		reader.readAsArrayBuffer(droppedFiles[0]);
	}

	 
	function onDroppedMP3Loaded(data) {

		if(audioContext.decodeAudioData) {
			audioContext.decodeAudioData(data, function(buffer) {
				audioBuffer = buffer;
				startSound();
			}, function(e) {
				console.log(e);
			});
		} else {
			audioBuffer = audioContext.createBuffer(data, false );
			startSound();
		}
	}

	
	
	function onBeat(){
		gotBeat = true;
		if (Controls.audioParams.bpmMode) return;
		 
	}

	function audioUpdate(){
		//console.log("here");
		if (!isPlayingAudio) return;
		//console.log("here2");
		//GET DATA
		analyser.getByteFrequencyData(freqByteData); //<-- bar chart
		analyser.getByteTimeDomainData(timeByteData); // <-- waveform

		//console.log(freqByteData);

		//normalize waveform data
		for(var i = 0; i < binCount; i++) {
			waveData[i] = ((timeByteData[i] - 128) /128 )* Controls.audioParams.volSens;
		}
		//TODO - cap levels at 1 and -1 ?

		//normalize levelsData from freqByteData
		for(var i = 0; i < levelsCount; i++) {
			var sum = 0;
			for(var j = 0; j < levelBins; j++) {
				sum += freqByteData[(i * levelBins) + j];
			}
			levelsData[i] = sum / levelBins/256 * Controls.audioParams.volSens; //freqData maxs at 256

			 
		}		 

		//GET AVG LEVEL
		var sum = 0;
		for(var j = 0; j < levelsCount; j++) {
			sum += levelsData[j];
		}
		
		level = sum / levelsCount;

		levelHistory.push(level);
		levelHistory.shift(1);

		//BEAT DETECTION
		if (level  > beatCutOff && level > BEAT_MIN){
			onBeat();
			beatCutOff = level *1.1;
			beatTime = 0;
		}else{
			if (beatTime <= Controls.audioParams.beatHoldTime){
				beatTime ++;
			}else{
				beatCutOff *= Controls.audioParams.beatDecayRate;
				beatCutOff = Math.max(beatCutOff,BEAT_MIN);
			}
		}


		bpmTime = (new Date().getTime() - bpmStart)/msecsAvg;
		//console.log(bpmTime);
		beats=beatCutOff;
		 
	}

	return {
		onMP3Drop: onMP3Drop,		 
		onUseSample:onUseSample,
		audioUpdate:audioUpdate,
		init:init,
		level:level,
		levelsData:levelsData,
		onTogglePlay:onTogglePlay,
		beatCutOff:beatCutOff
	};
}();