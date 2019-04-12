var debugmode = false;

var states = Object.freeze({
    SplashScreen: 0,
    GameScreen: 1,
    ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = jQuery("#flyarea").height();

var score = 0;
var highscore = 0;

var pipeheight = 82;
var pipeheightArr = new Array(); //hughchiu, pipeheightArr follows pipes.
var pipes = new Array();
var pipewidth = 52;

var replayclickable = false;

//sounds
var volume = 30;
var soundJump = new buzz.sound("/file/24293422/0");
var soundScore = new buzz.sound("/file/24293209/0");
var soundHit = new buzz.sound("/file/24293110/0");
//var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("/file/24293244/0");
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;

jQuery(document).ready(function() {
    //debugmode = true;
    //if (window.location.search == "?debug")
    //    debugmode = true;
    //if (window.location.search == "?easy")
    //    pipeheight = 200;

    //get the highscore
    var savedscore = getCookie("highscore");
    if (savedscore != "")
        highscore = parseInt(savedscore);

    //start with the splash screen
    showSplash();
});

function getCookie(cname) {
    return "";
}

function setCookie(cname, cvalue, exdays) {}

function showSplash() {
    removeEvents(); //hughchiu
    currentstate = states.SplashScreen;

    //set the defaults (again)
    velocity = 0;
    position = 180;
    rotation = 0;
    score = 0;

    //update the player in preparation for the next game
    jQuery("#player").css({ y: 0, x: 0 });
    updatePlayer(jQuery("#player"));

    soundSwoosh.stop();
    soundSwoosh.play();

    //clear out all the pipes if there are any
    jQuery(".pipe").remove();
    pipes = new Array();
    pipeheightArr = new Array(); //hughchiu

    //make everything animated again
    jQuery(".animated").css('animation-play-state', 'running');
    jQuery(".animated").css('-webkit-animation-play-state', 'running');

    //fade in the splash
    //jQuery("#splash").transition({ opacity: 1 }, 2000, 'ease');//hughchiu
    jQuery("#gameInfo").transition({ opacity: 1 }, 2000, 'ease'); //hughchiu
}

function startGame() {
    currentstate = states.GameScreen;
    //pipeheight = 200; //hughchiu
    //fade out the splash//hughchiu
    //jQuery("#splash").stop();//hughchiu
    //jQuery("#splash").transition({ opacity: 0 }, 500, 'ease');//hughchiu
    jQuery("#gameInfo").stop(); //hughchiu
    jQuery("#gameInfo").transition({ opacity: 0 }, 500, 'ease'); //hughchiu

    //update the big score
    setBigScore();

    //debug mode?
    if (debugmode) {
        //show the bounding boxes
        jQuery(".boundingbox").show();
    }

    //start up our loops
    var updaterate = 1000.0 / 60.0; //60 times a second
    loopGameloop = setInterval(gameloop, updaterate);
    loopPipeloop = setInterval(updatePipes, 1400);

    //jump from the start!
    playerJump();
}

function updatePlayer(player) {
    //rotation
    rotation = Math.min((velocity / 10) * 90, 90);

    //apply rotation and position
    jQuery(player).css({ rotate: rotation, top: position });
}

function gameloop() {
    var player = jQuery("#player");

    //update the player speed/position
    velocity += gravity;
    position += velocity;

    //update the player
    updatePlayer(player);

    //create the bounding box
    var box = document.getElementById('player').getBoundingClientRect();
    var origwidth = 34.0;
    var origheight = 24.0;

    var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
    var boxheight = (origheight + box.height) / 2;
    var boxleft = ((box.width - boxwidth) / 2) + box.left;
    var boxtop = ((box.height - boxheight) / 2) + box.top;
    var boxright = boxleft + boxwidth;
    var boxbottom = boxtop + boxheight;

    //if we're in debug mode, draw the bounding box
    if (debugmode) {
        var boundingbox = jQuery("#playerbox");
        boundingbox.css('left', boxleft);
        boundingbox.css('top', boxtop);
        boundingbox.css('height', boxheight);
        boundingbox.css('width', boxwidth);
    }

    //did we hit the ground?
    if (box.bottom >= jQuery("#land").offset().top) {
        playerDead();
        return;
    }

    //have they tried to escape through the ceiling? :o
    var ceiling = jQuery("#ceiling");
    if (boxtop <= (ceiling.offset().top + ceiling.height()))
        position = 0;

    //we can't go any further without a pipe
    if (pipes[0] == null)
        return;

    //determine the bounding box of the next pipes inner area
    var nextpipe = pipes[0];
    var pipeheighttmp = pipeheightArr[0]; //hughchiu
    var nextpipeupper = nextpipe.children(".pipe_upper");

    var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
    var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
    var piperight = pipeleft + pipewidth;
    var pipebottom = pipetop + pipeheighttmp; //pipeheight;hughchiu

    if (debugmode) {
        var boundingbox = jQuery("#pipebox");
        boundingbox.css('left', pipeleft);
        boundingbox.css('top', pipetop);
        boundingbox.css('height', pipeheighttmp); //pipeheight hughhciu
        boundingbox.css('width', pipewidth);
    }

    //have we gotten inside the pipe yet?
    if (boxright > pipeleft) {
        //we're within the pipe, have we passed between upper and lower pipes?
        if (boxtop > pipetop && boxbottom < pipebottom) {
            //yeah! we're within bounds

        } else {
            //no! we touched the pipe
            playerDead();
            return;
        }
    }

    //have we passed the imminent danger?
    if (boxleft > piperight) {
        //yes, remove it
        pipes.splice(0, 1);
        pipeheightArr.splice(0, 1); //hughchiu  
        //and score a point
        playerScore();
    }
}

//Handle space bar
jQuery(document).keydown(function(e) {
    //space bar!
    if (e.keyCode == 32) {
        //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
        if (currentstate == states.ScoreScreen)
            jQuery("#replay").click();
        else
            screenClick();
    }
});

//Handle mouse down OR touch start
function bindEvents() { //hughchiu
    if ("ontouchstart" in window)
        jQuery(document).on("touchstart", screenClick);
    else
        jQuery(document).on("mousedown", screenClick);
    jQuery(document).off("dblclick");
}

function removeEvents() { //hughchiu
    jQuery(document).off("touchstart");
    jQuery(document).off("mousedown");
}

function screenClick() {
    if (currentstate == states.GameScreen) {
        playerJump();
    } else if (currentstate == states.SplashScreen) {
        //if (event.target.nodeName != "BUTTON") //hughchiu
        startGame();
    }
}

function playerJump() {
    velocity = jump;
    //play jump sound
    soundJump.stop();
    soundJump.play();
}

function getImgSrc(num) {
    var bigImgSrc = ["/file/24294185/0", "/file/24294202/0", "/file/24294218/0", "/file/24294244/0", "/file/24294263/0", "/file/24294280/0", "/file/24294301/0", "/file/24294321/0", "/file/24294338/0", "/file/24294354/0"];
    var smallImgSrc = ["src1", "src2", "src3"];
    return bigImgSrc[num];
}

function setBigScore(erase) {
    var elemscore = jQuery("#bigscore");
    elemscore.empty();

    if (erase)
        return;

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='" + getImgSrc(digits[i]) + "' alt='" + digits[i] + "'>");
}

function setSmallScore() {
    var elemscore = jQuery("#currentscore");
    elemscore.empty();

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='" + getImgSrc(digits[i]) + "' alt='" + digits[i] + "'>");
}

function setHighScore() {
    var elemscore = jQuery("#highscore");
    elemscore.empty();

    var digits = highscore.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='" + getImgSrc(digits[i]) + "' alt='" + digits[i] + "'>");
}

function setMedal() {
    var elemmedal = jQuery("#medal");
    elemmedal.empty();

    if (score < 10)
    //signal that no medal has been won
        return false;

    if (score >= 10)
        medal = "/file/24294394/0";
    if (score >= 20)
        medal = "/file/24294414/0";
    if (score >= 30)
        medal = "/file/24294431/0";
    if (score >= 40)
        medal = "/file/24294448/0";

    elemmedal.append('<img src="' + medal + '">');

    //signal that a medal has been won
    return true;
}

function playerDead() {
    //stop animating everything!
    jQuery(".animated").css('animation-play-state', 'paused');
    jQuery(".animated").css('-webkit-animation-play-state', 'paused');

    //drop the bird to the floor
    var playerbottom = jQuery("#player").position().top + jQuery("#player").width(); //we use width because he'll be rotated 90 deg
    var floor = flyArea;
    var movey = Math.max(0, floor - playerbottom);
    jQuery("#player").transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');

    //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
    currentstate = states.ScoreScreen;

    //destroy our gameloops
    clearInterval(loopGameloop);
    clearInterval(loopPipeloop);
    loopGameloop = null;
    loopPipeloop = null;

    //mobile browsers don't support buzz bindOnce event
    if (isIncompatible.any()) {
        //skip right to showing score
        showScore();
    } else {
        //play the hit sound (then the dead sound) and then show score
        soundHit.play().bindOnce("ended", function() {
            //    soundDie.play().bindOnce("ended", function() {
            showScore();
        });
        //});
    }
    //hughhiu add some code here to act with smart contract
}

function showScore() {
    //unhide us
    jQuery("#scoreboard").css("display", "block");

    //remove the big score
    setBigScore(true);

    //have they beaten their high score?
    if (score > highscore) {
        //yeah!
        highscore = score;
        //save it!
        setCookie("highscore", highscore, 999);
    }

    //update the scoreboard
    setSmallScore();
    setHighScore();
    var wonmedal = setMedal();

    //SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();

    //show the scoreboard
    jQuery("#scoreboard").css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
    jQuery("#replay").css({ y: '40px', opacity: 0 });
    jQuery("#scoreboard").transition({ y: '0px', opacity: 1 }, 600, 'ease', function() {
        //When the animation is done, animate in the replay button and SWOOSH!
        soundSwoosh.stop();
        soundSwoosh.play();
        jQuery("#replay").transition({ y: '0px', opacity: 1 }, 600, 'ease');

        //also animate in the MEDAL! WOO!
        if (wonmedal) {
            jQuery("#medal").css({ scale: 2, opacity: 0 });
            jQuery("#medal").transition({ opacity: 1, scale: 1 }, 1200, 'ease');
        }
    });

    summitScore(); //hughchiu
    //make the replay button clickable
    replayclickable = true;
}

jQuery("#replay").click(function() {
    //make sure we can only click once
    if (!replayclickable)
        return;
    else
        replayclickable = false;
    //SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();

    //fade out the scoreboard
    jQuery("#scoreboard").transition({ y: '-40px', opacity: 0 }, 1000, 'ease', function() {
        //when that's done, display us back to nothing
        jQuery("#scoreboard").css("display", "none");

        //start the game over!
        showSplash();
    });
});

function playerScore() {
    score += 1;
    //play score sound
    soundScore.stop();
    soundScore.play();
    setBigScore();
}

function updatePipes() {
    pipeheight = randomNum(82, 98); //hughchiu
    //Do any pipes need removal?
    jQuery(".pipe").filter(function() { return jQuery(this).position().left <= -100; }).remove()

    //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
    var padding = 80;
    var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
    var topheight = Math.floor((Math.random() * constraint) + padding); //add lower padding
    var bottomheight = (flyArea - pipeheight) - topheight;
    var newpipe = jQuery('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
    jQuery("#flyarea").append(newpipe);
    pipes.push(newpipe);
    pipeheightArr.push(pipeheight); //hughchiu
}

function randomNum(minNum, maxNum) {
    return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
}

var isIncompatible = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Safari: function() {
        return (navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/));
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
    }
};