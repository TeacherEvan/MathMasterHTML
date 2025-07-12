// …existing code…

let firstLineAnnounced = false;

function onLineSolved(rowIdx) {
	// rowIdx === 0  → first visible line
	if (rowIdx === 0 && !firstLineAnnounced) {
		firstLineAnnounced = true;
		document.dispatchEvent(new Event('first-line-solved'));
	}
	// …existing success handling…
}

// …existing code…
