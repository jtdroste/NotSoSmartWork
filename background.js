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

	// Grab the question ID
	qid = q.attr('id');

	// Grab the solution response for this QID
	answer = '--NOT-FOUND--';
	$(window.XMLDOC.getElementsByTagName('solutionResponse')[0]).children('modules').children().each(function() {
		if ( $(this).attr('id') != qid ) return;

		rawAnswer = $(this).children('laTex')[0].innerHTML;
		answer = decodeURIComponent(rawAnswer);
	});

	// Now grab all the algos
	algos = [];
	known_algos = [];
	$(window.XMLDOC.getElementsByTagName('algoSet')).children().each(function() {
		algo = $(this);
		algo_id = decodeURIComponent(algo.attr('id'));

		new_algo = {
			id: algo_id,
			is_rand_value: $(this).children('equation').length == 0,
			equation: '',
		}

		if ( !new_algo.is_rand_value ) {
			new_algo.equation = decodeURIComponent($(this).children('equation')[0].innerHTML);
			known_algos.push(algo_id);
		}

		algos.push(new_algo);
	})

	// Now let's try to compute it
	origAnswer = answer;
	magic_regex_algo = /\\algo{__algo([0-9])__}{([a-z0-9]*)}/gi;
	magic_regex_algo_number = /__algo([0-9])__/gi;

	while ( true ) {
		replaced = false;

		algos_to_replace = answer.match(magic_regex_algo);
		if ( algos_to_replace == null ) break;

		for ( i=0; i < algos_to_replace.length; i++ ) {
			search_str = algos_to_replace[i];
			algo_id = algos_to_replace[i].match(magic_regex_algo_number)[0];


			if ( jQuery.inArray(algo_id, known_algos) !== -1 ) {
				// WE KNOW THIS OMGOMGOMG
				equation = '';

				for ( j=0; j < algos.length; j++ ) {
					if ( algos[j].id != algo_id ) continue;

					equation = algos[j].equation;
				}

				answer = answer.replace(search_str, equation);
				replaced = true;
			}
		}

		if ( !replaced ) break;
	}

	return answer;
}