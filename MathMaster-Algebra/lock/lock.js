// …existing code…

let lockIsLive = false;

function startLockAnimation() {
	if (lockIsLive) return;          // already running
	lockIsLive = true;
	// …existing code that starts / plays the animation…
}

// wait for middle-screen to report its first success
document.addEventListener('first-line-solved', startLockAnimation);

// if your old code auto-started, disable / remove that call
// initLock();          <-- delete / comment out this kind of line

// …existing code…
