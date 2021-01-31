/* Spatial Working Memory K-Task

author: Jordan Garrett
contact: jordangarrett@ucsb.edu
*/


//GLOBAL VARIABLES
//----------------------------------------------------------------------------------------------------

const location_binAngles = new Array(0,60,120,180,240,300); //angles the empty circles are drawn in

const set_sizes = Array.from({length: 6}, (_, i) => i + 1); //set sizes from 1-6
	
//this will allows easier manipulation of the number of trials
const n_trials_per_setsize = jatos.componentJsonInput.nTrials_per_setSize

var num_trials = set_sizes.length*n_trials_per_setsize; //360 trials, 60 trials per set size. About 20 minutes

var num_blocks = jatos.componentJsonInput.num_blocks;  //change to 10

// check if even number of trials or if number of trials evenly divisble by number of set sizes (so we can have same amount for each)
if (num_trials%2 != 0){
	throw new Error('EVEN NUMBER OF TRIALS REQUIRED')
} else if (n_trials_per_setsize%2){
	throw new Error('NUMBER OF TRIALS NOT EVEN ACROSS CHANGE TYPES')
} else if (num_trials%num_blocks) {
	throw new Error('NUMBER OF TRIALS NOT EVEN ACROSS BLOCKS')
}

var trial_setSizes = Array.from({length: n_trials_per_setsize}, () => set_sizes).flat() //repeated array of each set size equally for n trials
		
var num_practice_blocks = 1

var num_pracTrials = set_sizes.length * 3 //18 trials

var change_shift = 90 //degrees

//size of canvas we are presenting on
const canv_width = $(window).width();
const canv_height = $(window).height();

// radius of circle stimuli will appear around
const canv_radius = 200;

const stim_radius = 39.76;

// size of the stimulus in degrees
const stim_angSize = Math.acos(((2*Math.pow(canv_radius,2))-Math.pow(stim_radius,2))/(2*Math.pow(canv_radius,2)))*(180/Math.PI)

// minimum buffer of empty space between stimuli
const stim_buffer = stim_angSize + 30

//Custom JQuery and Global functions
//----------------------------------------------------------------------------------------------------
//jquery functions for objects
jQuery.fn.center = function () {
	this.css({'position':'absolute',
		'left':'50%',
		'top':'50%',
		'transform':'translate(-50%, -50%)'
	});
	return this;
}

jQuery.fn.rotate = function(degrees) {
	$(this).css({'-webkit-transform' : 'rotate('+ degrees +'deg)',
		'-moz-transform' : 'rotate('+ degrees +'deg)',
		'-ms-transform' : 'rotate('+ degrees +'deg)',
		'transform' : 'rotate('+ degrees +'deg)',
		'transform-origin' : 'center left'});
	return $(this);
};

jQuery.fn.getAngle = function(){

	var el = $(this)[0];
	var st = window.getComputedStyle(el, null);
	var tr = st.getPropertyValue("-webkit-transform") ||
	st.getPropertyValue("-moz-transform") ||
	st.getPropertyValue("-ms-transform") ||
	st.getPropertyValue("-o-transform") ||
	st.getPropertyValue("transform") ||
	"FAIL";

  
  	var values = tr.split('(')[1].split(')')[0].split(',');
  	var a = values[0];
  	var b = values[1];
  	var c = values[2];
  	var d = values[3];

  	var scale = Math.sqrt(a*a + b*b);

  	

  	// arc sin, convert from radians to degrees, round
  	var sin = b/scale;

  	// next line works for 30deg but not 130deg (returns 50);
  	// var angle = Math.round(Math.asin(sin) * (180/Math.PI));
 	var angle = Math.round(Math.atan2(b, a) * (180/Math.PI));

  	//console.log('Rotate: ' + angle + 'deg');
  	return angle
}

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function permute( a, p ) {
	var r = [];
	for (var i = 0; i < a.length; ++i) {
		r.push(a[p[i]]);
	}
	return r;
}


//use when wanting to draw something new
function create_canvas() {

	//clear out old stuff
	$('div').remove()
	$('canvas').remove()
	$('button').remove()
	
	$('body').css({'background-color':'DarkGray'})
	var canvas_html = "<canvas id='expcanvas' width="+canv_width+" height="+canv_height+" style='border:0px solid DarkSlateGrey'></canvas>";
	$('body').append(canvas_html)
	$('#expcanvas').css({'background-color':'DarkGray',
		'position':'absolute','top':'0','bottom':'0','left':'0','right':'0',
		'margin':'auto'});
	$('body').append('<div id="canv_container"> </div>')
	$('#canv_container').css({'position':'absolute','top':'50%','left':'50%',
		'transform': 'translate(-50%, -50%)','width':canv_width+'px','height':canv_height + 'px',
		'text-align':'center'});


	//quit button
	$('body').append('<button id="quit">Quit</button>')
	$('#quit').css({'background-color': 'DarkGray',
		'border': 'none',
		'text-align': 'center',
		'position':'fixed','right':'60px','bottom':'20px',
		'color':'red',
		'font-family':'Arial', 
		'font-size': (1.334*22)+'px'})
	$('#quit').click((event) => {

		//check if we have created the spatial task object
		if (typeof spatial_task != 'undefined'){
			
			//check if there is data logged
			if (typeof spatial_task.data_recorder != 'undefined' && 
				spatial_task.data_recorder['Trial'].length != 0 && 
				spatial_task.practice != 0){

				var all_trialData = JSON.stringify(spatial_task.data_recorder, null, '\t')
  				jatos.endStudy(all_trialData,false,'Sj ended study before completing all trials')
			} else {
				jatos.abortStudy()
			}
		} else {
			jatos.endStudy(false,'Sj ended study before completing any trials')
		}
	})

}

//Clear canvas
function clear_canvas(){
  //clear canvas after stimulus displayed
  var context = $('#expcanvas')[0].getContext('2d')
  var canvas_width = $('#expcanvas')[0].width;
  var canvas_height = $('#expcanvas')[0].height;
  context.clearRect(0,0,canvas_width,canvas_height);

  //clear lines in div elements
  var children = $('#canv_container')[0].children
  while (children.length > 1){
  	for (let child of children){
  		let id = child.id;
  		if (id.includes('line')){
  			$('#'+id).remove();
  		}   
  	}
  }

}

// displays some text on the first screen
function welcome() {
	let text1 = `Welcome to PART 1 of this psychology experiment!\n\n`
	let text2 = `Press the button to continue.`;
	var welcome_text = text1.fontsize(5).bold() + text2.fontsize(4)

	$('#canv_container').append('<p id=text></p>');
	$('#canv_container').append('<button id="continue">Continue</button>');
	$('#text').html(welcome_text)
	$('#text').center()
	$('#text').css({'width':'85%', 'white-space':'pre-wrap', 'text-align':'center'})
	$('#continue').center()
	$('#continue').css({'top':'60%','font-size':'20px'})
	$('#continue').click(function(){
		if (document.documentElement.requestFullscreen){
			document.documentElement.requestFullscreen();
		} else if (document.documentElement.mozRequestFullScreen){
			document.documentElement.mozRequestFullScreen();
		} else if (document.documentElement.webkitRequestFullscreen){
			document.documentElement.webkitRequestFullscreen();
		} else if (document.documentElement.msRequestFullscreen){
			document.documentElement.msRequestFullscreen();
		}
		next_main_trialState()});
}

// Tells the participants how to complete the experiment
function overall_instructions() {
	let text1 = 
	`
	This experiment is a test of your working memory capacity.\n
	The entire experiment should take about 30 minutes.\n
	Please do your best to complete all of the trials.\n`

	let text2 = 
	`
	<b>DO NOT</b> refresh this page as it will clear your progress and your data will not be saved.\n
	If you'd like to stop during the experiment hit the lower right `
	
	let text3 = `QUIT ` 

	let text4 = `button at any time.\n\n If you have technical issues, please contact ` 
	
	let text5 = `jordangarrett@ucsb.edu ` 

	let text6 = `to receive partial compensation.\n\nTo view instructions for the task, click continue below.`

	var instruct_text = text1 + text2 + text3.fontcolor('red').bold() + text4 + 
						text5.fontcolor('blue').bold() + text6

	$('#canv_container').append('<p id=text></p>');
	$('#canv_container').append('<button id="continue">Continue</button>');
	$('#text').html(instruct_text.fontsize(5))
	$('#text').center()
	$('#text').css({'width':'85%', 'white-space':'pre-wrap','top':'40%', 'left':'48%',
					'text-align':'center'})
	$('#continue').center()
	$('#continue').css({'top':'75%', 'font-size':'20px'})
	//$('#continue').click(next_main_trialState);
	$('#continue').click((event) => {
		$('body').addClass('stop-scrolling')
		next_main_trialState()
	})
}

function end_experiment(task_object) {

	$('body').css('cursor','default')

	var end_exp_text = 
	`Thank you for completing this experiment.\n
	Hitting the button below will end the experiment.`;

	$('#canv_container').append('<p id=text></p>');
	$('#canv_container').append('<button id="continue">Continue</button>');
	$('#text').html(end_exp_text.fontsize(6))
	$('#text').center()
	$('#text').css({'width':'85%', 'white-space':'pre-wrap'})
	$('#continue').center()
	$('#continue').css({'top':'65%','font-size':'20px'})
	$('#continue').click((event) => {

		// dont save data on practice trials
		if (task_object.practice == 0){
			var all_trialData = JSON.stringify(task_object.data_recorder, null, '\t')
	  		jatos.endStudy(all_trialData, true, 'K Task Completed, Data Submitted')
		}
  	
  	});
}


//----------------------------------------------------------------------------------------------------
//Task Creation
class k_Spatial_Task{
	constructor(nTrials,set_sizes,practice){
		this.nTrials = nTrials-1; //java is a zero index language
		this.set_sizes = set_sizes;
		this.current_trial = 0;
		this.trial_state = 0;
		this.practice = practice //use to determine if they are completing a practice portion or not so we dont save those trials
	    this.stim_radius = stim_radius; 
	    this.stim_present = 250; // present stimulus for 250 ms 
	    this.stim_isi = 1000;
	    this.trials_per_block = nTrials / num_blocks

	    // 0 = same, 1 = change
		var trial_types = new Array(nTrials/2).fill([0,1]).flat().sort() // divide number of trials by 2 here since two elements in the array.

	    var stim_locs = this.generate_locations();

	    var all_locations = stim_locs[0]
	    var all_sampleProbeAngles = stim_locs[1]
	    var all_sampX_coor = stim_locs[2]
	    var all_sampY_coor = stim_locs[3]
	    var all_samp_locNum = stim_locs[4]
	    var all_samp_locBin = stim_locs[5]

	    var perm_idx = shuffle(_.range(this.nTrials+1))

	    this.trialLocations = permute(all_locations,perm_idx);
	    this.trialSampProbeAngs = permute(all_sampleProbeAngles,perm_idx);
	    this.trialSetSizes = permute(trial_setSizes,perm_idx)
	    this.trialSampleLocX = permute(all_sampX_coor,perm_idx);
	    this.trialSampleLocY = permute(all_sampY_coor,perm_idx);
	    this.trialSampleLocNumb = permute(all_samp_locNum,perm_idx);
	    this.trialSampleLocBin = permute(all_samp_locBin,perm_idx);
	    this.trialType = permute(trial_types,perm_idx)

	    
	    if (practice != 1){
	    	var blocks_idx = new Array()
		    for (let iBlock = 0; iBlock < num_blocks; iBlock++){
		    	blocks_idx.push(Array(this.trials_per_block).fill(iBlock+1))
		    }
		    blocks_idx = blocks_idx.flat()

		    trial_idx = new Array(num_blocks)
	    					.fill([...Array(this.trials_per_block).keys()])
	    					.flat()
	    					.map(function(num){return num+1})

		} else {
			var blocks_idx = new Array(num_pracTrials).fill(num_practice_blocks)
			var trial_idx = new Array(num_practice_blocks).fill([...Array(num_pracTrials).keys()]).flat().map(function(num){return num+1})
	    }
	    

	    // trials block number
	    this.block_num = blocks_idx
	    // trials number within the block
	    this.trial_idx = trial_idx
    
		// initialize an empty dict for recording data
		this.data_recorder = {
			'Block': new Array(),
			'Trial': new Array(),
			'SetSize': new Array(),
			'TrialType': new Array(),
			'SampleLocNumb': new Array(),
			'SampleLocBin': new Array(),
			'SampleLocationAngles': new Array (),
			'SampleLocX': new Array(),
			'SampleLocY': new Array(),
			'SampleProbeAngles': new Array(), 
			'RespProbeAngles': new Array(),
			'ChangeResponse': new Array()
		}


		this.allTrial_states = [
			() => {this.block_message(this.block_num[this.current_trial])},
			() => {this.display_fixation()},
			() => {this.start_trial()},
			() => {this.gen_sample_array()},
			() => {this.display_fixation(this.stim_isi)},
			() => {this.gen_test_array()}
		];
	

	    //this will be for starting the task, put the task instructions here
	    this.start = () => {
	    	this.startTime = Date.now();

	    	if (this.practice == 1){
	    		this.task_instructions();
	    	} else {
	    		this.task_main()

	    	}
	    	
	    	this.endTime = Date.now();
	    }


	    this.nextTrialState = () => {
	    	create_canvas()

	      	// if the next state exists, do it
	      	if (this.allTrial_states[this.trial_state]){

	      		if (this.trial_idx[this.current_trial] != 1 && this.trial_state == 0){
	      			this.trial_state++
	      			this.allTrial_states[this.trial_state]()
	      			this.trial_state++
	      		} else {
	      			this.allTrial_states[this.trial_state]()
	      			this.trial_state++
	      		}
      				
	      	} else {

	      		if (this.current_trial >= this.nTrials){
	      			next_main_trialState();
	      		} else {
		      		this.current_trial ++
		      		this.trial_state = 0;
		      		this.nextTrialState()
	      		}
	      	}
  		}

	  	this.start_trial = () => {

	  	  if($('body').css('cursor') == 'none'){
	  	  	$('body').css('cursor','default')
	  	  }
	      var fix_radius = 6.18; //?

	      var x_center = $('#canv_container').width()/2;
	      var y_center = $('#canv_container').height()/2;

	      var context = $('#expcanvas').get(0).getContext('2d');
	      context.beginPath()
	      context.arc(x_center,y_center,fix_radius,0,2*Math.PI);
	      context.fillStyle = 'blue';
	      context.strokeStyle = 'blue';
	      context.stroke()
	      context.fill()

	      $(document).keydown((event)=> {
	      	if(event.keyCode==32){

	      		$('body').css('cursor','none')

	      		$(document).off('keydown')
	      		$(document).unbind('keydown')
	      		this.nextTrialState()
	      	} 
	      })
	  	}		

	}


	display_fixation (duration=0) {

	    var fix_radius = 6.18; //?

	    var x_center = $('#canv_container').width()/2;
	    var y_center = $('#canv_container').height()/2;

	    var context = $('#expcanvas').get(0).getContext('2d');
	    context.beginPath()
	    context.arc(x_center,y_center,fix_radius,0,2*Math.PI);
	    context.fillStyle = 'blue';
	    context.strokeStyle = 'blue';
	    context.stroke()
	    context.fill()

	    //waits necessary time
	    var called = performance.now()
	    var timeout = setTimeout(() => {
	    	this.nextTrialState();
	    	this.sample_time = performance.now() - called}, duration)
	    
	}


	generate_locations(){

		var all_locations = new Array()
		var all_sampleProbeAngles = new Array()
		var all_setSizes = new Array ()
		var all_sampleLocX = new Array ()
		var all_sampleLocY = new Array ()
		var all_sampleLocNums = new Array ()
		var all_sampleLocBins = new Array ()

		var x = canv_width/2;
		var y = canv_height/2;

	    //first loop through each trial
    	for (let iTrial = 0; iTrial < this.nTrials+1; iTrial++){

    		let tempTrial_locAngles = new Array(); 
	      	var tempTrial_probeAngles = new Array();

	      	var tempTrial_locX = new Array();
	      	var tempTrial_locY = new Array();

	      	var tempTrial_locNumb = new Array();

	      	// use this to keep track of the bin that the stimulus appears in 
	      	var tempTrial_locBinAng = new Array();

	      	// shuffle location bin angles
	      	let shuff_bins = shuffle(location_binAngles)

	      	let n_samps = trial_setSizes[iTrial]

    		for (let iSamp = 0; iSamp < n_samps ; iSamp++){

    			let samp_bin = shuff_bins[iSamp] // we want the stimulus to appear between this bin boundary and the next which is 60 degrees away

    			let max_ang = Math.floor(samp_bin+60-(stim_buffer/2))
    			let min_ang = Math.floor(samp_bin + (stim_buffer/2))

    			let samp_angle = Math.floor(Math.random() * (max_ang - min_ang)) + min_ang //should generate random angle between bin boundaries
    			
	         	// ensure that samples do not overlap with one another
    			for (let iPrevSamp in tempTrial_locBinAng){

    				let prev_sampAng = tempTrial_locBinAng[iPrevSamp];
    				let ang_diff = prev_sampAng - samp_angle //calculate difference between new angle and previous ones
    				let new_minAng
    				if (Math.abs(ang_diff) < stim_buffer){

    					// compute the angle that satisfies minimum distance from previous samples
    					if(ang_diff < 1){
    						new_minAng = samp_angle + (stim_buffer+ang_diff)
    					} else{
    						new_minAng = samp_angle - (stim_buffer-ang_diff)
    					}
    					
    					// checking for errors
    					if(new_minAng > samp_bin+60 || new_minAng < samp_bin){
    						console.log('Problem')
    					}

    					// generate random sample angle that is at least minimum distance away from previous sample
    					if (ang_diff < 1){
    						
    						//angle needs to be larger
    						samp_angle = Math.floor(Math.random()*((samp_bin+60) - new_minAng+1)) + new_minAng
    					} else {
    						//angle needs to be smaller
    						samp_angle = Math.floor(Math.random()*(new_minAng - samp_bin+1)) + samp_bin

    					}
    					
    				}
    				
    			}

    			//calculate x and y coordinates of location
	          	let dx = canv_radius * Math.cos(-samp_angle*Math.PI/180);
	          	let dy = canv_radius * Math.sin(-samp_angle*Math.PI/180);

	          	let new_x = x + dx;
	         	let new_y = y + dy;


    			tempTrial_locAngles.push(samp_angle);
    			tempTrial_locX.push(new_x);
	          	tempTrial_locY.push(new_y);
	          	tempTrial_locNumb.push(iSamp);

	          	//generate random probe (black line) angles
	          	let probe_angle = Math.floor(Math.random() * (360 - 0 + 1)) + 0;
	          	tempTrial_probeAngles.push(probe_angle);


	          	tempTrial_locBinAng.push(samp_bin);

    		}

		  	all_locations.push(tempTrial_locAngles);
	  	    all_sampleLocX.push(tempTrial_locX);
		  	all_sampleLocY.push(tempTrial_locY);
		  	all_sampleProbeAngles.push(tempTrial_probeAngles);
		  	all_sampleLocNums.push(tempTrial_locNumb);

		  	all_sampleLocBins.push(tempTrial_locBinAng);
		
		}

		return [all_locations,all_sampleProbeAngles,all_sampleLocX,all_sampleLocY,all_sampleLocNums,all_sampleLocBins]
	}


	make_stimuli (period){

	    //current trial locations
	    var current_trialLocations = this.trialLocations[this.current_trial]
	    var current_trialAngles = this.trialSampProbeAngs[this.current_trial]
	    var current_trialsampX = this.trialSampleLocX[this.current_trial]
	    var current_trialsampY = this.trialSampleLocY[this.current_trial]

	    var samp_idx = new Array()

	    for(var iSamp = 0; iSamp < current_trialLocations.length; iSamp ++ ){
	      //create stimulus
	      var circ = $('#expcanvas').get(0).getContext('2d');
	      circ.strokeStyle = 'black';

	      let new_x = current_trialsampX[iSamp];
	      let new_y = current_trialsampY[iSamp];

	      circ.beginPath()
	      circ.fillStyle = 'DarkGray';

	      circ.lineWidth = 8;
	      circ.arc(new_x,new_y,this.stim_radius, 0, 2*Math.PI);

	      circ.stroke()
	      circ.fill()
	      
	      //draw probe line at angle between 0 & 360
	      let probe_angle = current_trialAngles[iSamp];

	      //check if this is the testing period and we need to change one of the stimuli
	      if (period == 'test' && this.trialType[this.current_trial] == 1){

	    	//randomly select a location to change 
	    	let change_loc = Math.floor(Math.random()*current_trialLocations.length)

	    	if (iSamp == change_loc){

	    		if (Math.random() < .5){
	    			change_shift *= -1
	    		}

	    		//shift one probe angle
	    		probe_angle += change_shift
	    	}
			
		  }

	      $('#canv_container').append('<div id="sampProbe_line'+iSamp+'" horizontal layout></div>')

	      $("#sampProbe_line"+iSamp).css({'position':'absolute','top': new_y, 'left': new_x , 'height': '5px', 'width': this.stim_radius + 1.3 + 'px',
	      	'background-color': 'black','border': '0px solid black'})

	      $("#sampProbe_line"+iSamp).rotate(probe_angle)

	  	} 

	}

	gen_sample_array(){
		this.make_stimuli('sample')

		// waits the necessary amount of time
	    var called = performance.now()
	    var timeout = setTimeout(() => {
	    	this.nextTrialState();
	    	this.sample_time = performance.now() - called}, this.stim_present)
	}

	gen_test_array (){

		let fixX_center = $('#canv_container').width()/2
		let fixY_center = $('#canv_container').height()/2

	    var fix_radius = 6.18; //?

	    var x_center = $('#expcanvas').width()/2;
	    var y_center = $('#expcanvas').height()/2;

	    var context = $('#expcanvas').get(0).getContext('2d');
	    context.beginPath()
	    context.arc(x_center,y_center,fix_radius,0,2*Math.PI);
	    context.fillStyle = 'blue';
	    context.strokeStyle = 'blue';
	    context.stroke()
	    context.fill()

	    //draw test stimuli
	    this.make_stimuli('test')

	    let trial_numb = this.current_trial

	    //get stimulus location angles
	    var test_probeAngles = new Array()
	    for (var iSamp in this.trialSampleLocNumb[trial_numb]){

	    	let test_angle = $("#sampProbe_line"+iSamp).getAngle()
	    	if (test_angle < 0){
				test_angle += 360
			}
	    	test_probeAngles.push(test_angle)
	    }

	    //create dict for sample location angles to make saving nicer
      	let Samp_ProbAngs = {}
      	let current_sampAngs = this.trialSampProbeAngs[trial_numb]
      	for (let iSamp = 0; iSamp < current_sampAngs.length; iSamp++){

      		Samp_ProbAngs[iSamp] = current_sampAngs[iSamp]
      	}

      	//set response key press to 0
	  	var responseKey_pressed = 0

  		//press space after rotating probe stimuli 
  		$(document).keydown((event)=>{

  			//pressed the 's' key for same
  			if (event.keyCode == 83){
  				var trial_changeResponse = 0 // no change
  				responseKey_pressed = 1
	  			
  			} else if (event.keyCode == 68) {
  				var trial_changeResponse = 1
  				responseKey_pressed = 1
  			}

  			if (responseKey_pressed){
  				this.data_recorder['Trial'].push(trial_numb)
		      	this.data_recorder['Block'].push(this.block_num[trial_numb])
		      	this.data_recorder['SetSize'].push(this.trialSetSizes[trial_numb])
		      	this.data_recorder['TrialType'].push(this.trialType[trial_numb])
		      	this.data_recorder['SampleLocNumb'].push(this.trialSampleLocNumb[trial_numb])
		      	this.data_recorder['SampleLocBin'].push(this.trialSampleLocBin[trial_numb])
		      	this.data_recorder['SampleLocationAngles'].push(this.trialLocations[trial_numb])
		      	this.data_recorder['SampleLocX'].push(this.trialSampleLocX[trial_numb])
		      	this.data_recorder['SampleLocY'].push(this.trialSampleLocY[trial_numb])
		      	this.data_recorder['SampleProbeAngles'].push(Samp_ProbAngs)
			  	this.data_recorder['RespProbeAngles'].push(test_probeAngles) //this is what we compare with SampleProbeAngles
			  	this.data_recorder['ChangeResponse'].push(trial_changeResponse)

		      	this.nextTrialState()
		      	$(document).off('keydown')
		      	$(document).unbind('keydown')
  			}

		})


	} 

	task_instructions() {
		
		var task_instruct_text = `
		For this task you will be asked to remember the orientation of lines in a series of locations.\n
		First, to begin a trial press the <b>SPACEBAR</b>. Then, a blue circle will appear in the center of the screen.\n
		Please keep your gaze on the blue circle for the remainder of a trial.\n
		Next, empty circles containing black lines will appear. \n
		<b>Do your best to remember the orientation of as many of these black lines as possible.</b>\n\n
		
		After a short delay, the circles will appear in the same location.\n
		On some trials, the black line inside of the circles will be at the same orientation (i.e. SAME).\n
		On other trials, the black line inside of ONE circle will have rotated (i.e. DIFFERENT).\n 

		To indicate if the all black lines are in the <b> SAME </b> orientation, <b> press 'S'</b> \n 
		To indicate if one black line is in a <b> DIFFERENT </b> orientation, <b> press 'D'</b> \n 
		
		Please be sure you understand these instructions. When you are ready to start, click the button below. Good luck!`; 
			
		$('#canv_container').append('<p id=text></p>');
		$('#canv_container').append('<button id="continue">Continue</button>');
		$('#text').html(task_instruct_text)
		$('#text').center()
		$('#text').css({'width':'85%', 'white-space':'pre-wrap','text-align':'center',
						'top':'43%', 'left':'48%', 'font-size':(1.334*16)+'px'})
		
		$('#continue').center()
		$('#continue').css({'top':'95%','left':'50%','font-size':'20px'})
		$('#continue').click((event) => {
			this.task_practice();
		});
	}


	task_practice(){

		create_canvas()
		var pratice_instruct = `
		You will now begin the practice phase.\n
		To start, click the button below.
		`

		$('#canv_container').append('<p id=text></p>')
		$('#canv_container').append('<button id="practice">Start Practice</button>')
		$('#text').text(pratice_instruct)
		$('#text').center()
		$('#text').css({'width':'85%', 'white-space':'pre-wrap','text-align':'center',
						'font-size':(1.334*20)+'px', 'left':'47%'})
		
		$('#practice').center()
		$('#practice').css({'top':'65%','left':'50%','font-size':'25px'})
		$('#practice').click((event) => {
			this.nextTrialState()
		});

	}

	task_main(){
		create_canvas() // clear old instructions

		if ($('body').css('cursor') == 'none'){
			$('body').css('cursor','default')
		}

		var main_instruct = `
		You have fininshed the practice phase.\n
		Time to do the real experiment! \n
		To start, click the button below.
		`

		$('#canv_container').append('<p id=text></p>')
		$('#canv_container').append('<button id="main">Start Experiment</button>')
		$('#text').text(main_instruct)
		$('#text').center()
		$('#text').css({'width':'85%', 'white-space':'pre-wrap','text-align':'center',
						'font-size':(1.334*20)+'px', 'left':'47%'})
		
		$('#main').center()
		$('#main').css({'top':'70%','left':'50%','font-size':'25px'})
		$('#main').click((event) => {
			this.nextTrialState()
		});
	}


	block_message(block_number){

		create_canvas() // clear old instructions

		if ($('body').css('cursor') == 'none'){
			$('body').css('cursor','default')
		}

		var block_text

		if (this.practice == 1){
			block_text = `Practice Block ` + block_number + ' of ' + num_practice_blocks
		} else {
			block_text = `Block ` + block_number + ' of ' + num_blocks
		}
		

		$('#canv_container').append('<p id=text></p>')
		$('#canv_container').append('<button id="block">Start Block</button>')
		$('#text').text(block_text)
		$('#text').center()
		$('#text').css({'width':'85%', 'white-space':'pre-wrap','text-align':'center',
						'font-size':(1.334*40)+'px', 'left':'50%', 'font-weight':'bold', 'top':'40%'})
		
		$('#block').center()
		$('#block').css({'top':'55%','left':'50%','font-size':'25px'})
		$('#block').click((event) => {
			this.nextTrialState()
		});
		
	}

		
}

//----------------------------------------------------------------------------------------------------
//Run Task
let do_practice = 1
var practice_kTask = new k_Spatial_Task(num_pracTrials,set_sizes,do_practice)

do_practice = 0
var k_task = new k_Spatial_Task(num_trials, set_sizes, do_practice);

//NEED TO DEFINE MAIN STATES
// The state machine for the entire experiment
var states = [
welcome,
overall_instructions,
practice_kTask.start,
k_task.start
];


var cur_main_state = 0;
function next_main_trialState () {
	create_canvas()

	if (states[cur_main_state]) {
		states[cur_main_state]()
	} else {
		end_experiment(k_task)
	}
	cur_main_state++
}

$(window).ready(function(){
	next_main_trialState();
});



