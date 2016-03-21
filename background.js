window.XMLDOC = null;
window.JQDOC = null;
window.SOL = null;

chrome.webRequest.onCompleted.addListener(function(details) {
	// We only want the "requestMethod=getItemByID" call
	if ( details.method == 'POST' && details.url.indexOf('requestMethod=getItemByID') !== -1 ) {
		// Re-fetch the URL, because chrome doesn't let us get the content body of this request
		// We could post to emulate the client more, but nah...
		$.get(details.url, function(data) {
			getTheAnswerJim(data);
		});
	}
}, {
	urls: ["*://smartwork.wwnorton.com/production/norton/ibis/css/StudentPHPBridge.php*"]
});

function getTheAnswerJim(data) {
	parser = new DOMParser();
	window.XMLDOC = parser.parseFromString(data, "text/xml");
	
	window.JQDOC = $(data);

	// Get the title
	title = decodeURI(window.XMLDOC.getElementsByTagName('title')[0].innerHTML);

	// Get the graded portions
	graded = [];
	solutions = [];

	$(window.XMLDOC.getElementsByTagName('question')).children().each(function() {
		if ( $(this).attr('usage') != 'graded' ) return;

		switch ( $(this).attr('owner') ) {
			case 'MultipleChoice%2FmMultipleChoice':
				graded.push('MultipleChoice');

				sol = solveMultipleChoice($(this), graded.length-1);
				solutions.push(sol);
			break;

			case 'Ranking%2FRanking':
				graded.push('Ranking');

				sol = solveRanking($(this), graded.length-1);
				solutions.push(sol);
			break;

			case 'DragNDrop%2FDragNDrop':
				graded.push('Drag&Drop');

				solutions.push('Unimplemented');
			break;

			case 'Numeric%2FmNumericEntry':
				graded.push('Solve');

				sol = solveNumeric($(this), graded.length-1);
				solutions.push(sol);
			break;

			default:
				graded.push('Unknown:'+$(this).attr('owner'));

				solutions.push('Unknown - Please tell James about this!');
			break;
		}
	});
	
	// Pretty output
	console.log('Question: '+title);
	for ( i=0; i < graded.length; i++ ) {
		console.log('Type: '+graded[i]);
		console.log('Answer:');
		console.log(solutions[i]);
	}
	console.log('--------------------');
}

/*
 * ---------------------------------------------------
 *              PROBLEM "SOLVING" CODE
 * ---------------------------------------------------
 */

// Get the answer from <solutionResponse>
// This is so ugly...
function getOuterAnswer(item) {
	return $(window.XMLDOC.getElementsByTagName('solutionResponse')[0]).children('modules').children()[item];
}

function solveMultipleChoice(q, item) {
	// Get the questions
	questions = q.children('mcItems').children();

	// Now the answer
	answerItems = [];
	$(getOuterAnswer(item)).children().each(function() {
		if ( $(this).html() != "true" ) return;

		answerItems.push(this.nodeName);
	});

	// Now match up the answers to the questions from the answerItems array
	solution = [];

	questions.each(function() {
		mcItem = $($(this).children()[2]).text();

		if ( jQuery.inArray(mcItem, answerItems) !== -1 ) {
			// FOUND A MATCH YEAH
			rawSol = $($(this).children()[1]).text();
			rawSol = decodeURIComponent(rawSol);

			sol    = $(rawSol).text();

			solution.push(sol);
		}
	});

	return solution;
}

function solveRanking(q, item) {
	q.children().each(function() {
		elm = $(this);
		name = this.nodeName;
	});

	/*
		1. Iterate over every child of q, check if first 13 chars of name is
		  "rankingObject", group them together
		2. Iterate over rankObjects, get <rankingObjectXPosition> from solutionResponse,
		   put them in an array
		3. Get what rankingObject X is, based on case (if NonEquationText exists, if Image exists)
	*/

	return "Unimplemented";
}

function solveNumeric(q, item) {
	/*
		1. From solutionResponse, retrive the algo that the number is
		2. Recursively retrieve every algo, until you hit the end, or a multiselect
		3. Output formula, leave room for multiselect. Display multiselect options.

		EX:
		4{\times}{\pi}{\times}(10^{7})^{2}{\times}5.67{\times}10^{-8}{\times}(__ALGO0__)^{4}
		__ALGO0__ = 1e5, 1e6, 1e7, 1e8
	*/
	return "Unimplemented";
}