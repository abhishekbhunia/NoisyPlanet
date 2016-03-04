
var Controls = function() {

	
	var audioParams = {
		useMic: false,
		useSample:true,
		volSens:1.5,
		beatHoldTime:6,
		beatDecayRate:0.93,		
	};

	function init(){

		//DAT GUI control  
		gui = new dat.GUI({autoPlace: false });
		$('#controls').append(gui.domElement);
		var f2 = gui.addFolder('Settings - Audio');		 
		f2.add(audioParams, 'volSens', 0, 5).step(0.1).name("Gain");
		f2.add(audioParams, 'beatHoldTime', 0, 100).step(1).name("Beat Hold");
		f2.add(audioParams, 'beatDecayRate', 0.9, 1).step(0.01).name("Beat Decay");
		f2.open();	 
		 
		AudioClass.onUseSample();

	}

	return {
		init:init,
		audioParams: audioParams,
	};
}();