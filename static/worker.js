let workerData = {};
let workerSelf = self;

self.onmessage = function(event) {
    setProgressBarValue(0);
    
    workerData = event.data.data;
    let results = generateResults();
    if (workerData.forResultType === 'table') {
        generateTable(results);
    } else if (workerData.forResultType === 'csv') {
        generateResultBlob(results);
    }
}

/**
     * Generates the results by combining the words from two loaded files.
     * 
     * @returns {Array} The combined array of words from both files.
     */
function generateResults() {
    let file1Words = generateFile1Results(); // 20%
    let file2Words = generateFile2Results(); // 20%

    let combined = combineArrays(file1Words, file2Words); // 30%

    return combined;
}

/**
     * Generates file1 results based on the given restrictions and selected options.
     * @returns {Array} An array of file1 words that pass the restrictions.
     */
function generateFile1Results() {
    let file1Words = [];
    let isAnd = workerData.isAnd1;
    let restrictions1 = workerData.restrictions1;
    
    let progress = getProgressBarValue();
    if (restrictions1.length === 0) {
        progress += 20;
        setProgressBarValue(progress);
        return workerData.file1Contents;
    }
    
    let oldProgress = progress;
    for (let i = 1; i < workerData.file1Contents.length; i++) {
        progress = oldProgress + ((i / workerData.file1Contents.length) * 20);
        setProgressBarValue(progress);

        let row = workerData.file1Contents[i];
        let word = row[workerData.file1IndexWord];
        if (word === undefined || word === '' || word === null) {
            continue;
        }

        let passed = false;
        for (let j = 0; j < restrictions1.length; j++) {
            let restriction = restrictions1[j];
            let column1 = restriction.column1;
            let comparison = restriction.comparison;
            let isColumn = restriction.isColumn;
            let column2 = restriction.column2;

            let value = row[column1];
            let compareValue = isColumn ? row[column2] : column2;

            passed = evaluateExpr(parseComparableValue(value), comparison, parseComparableValue(compareValue));

            if (isAnd && !passed) {
                break;
            } else if (!isAnd && passed) {
                break;
            }
        }

        if (passed) {
            file1Words.push(row);
        }
    }

    return file1Words;
}

function generateFile2Results() {
    let file2Words = [];
    let isAnd = workerData.isAnd2;
    let restrictions2 = workerData.restrictions2;

    let progress = getProgressBarValue();
    if (restrictions2.length === 0) {
        progress += 20;
        setProgressBarValue(progress);
        return workerData.file2Contents;
    }

    let oldProgress = progress;
    for (let i = 1; i < workerData.file2Contents.length; i++) {
        progress = oldProgress + ((i / workerData.file2Contents.length) * 20);
        setProgressBarValue(progress);

        let row = workerData.file2Contents[i];
        let word = row[workerData.file2IndexWord];
        if (word === undefined || word === '' || word === null) {
            continue;
        }

        let passed = false;
        for (let j = 0; j < restrictions2.length; j++) {
            let restriction = restrictions2[j];
            let column1 = restriction.column1;
            let comparison = restriction.comparison;
            let isColumn = restriction.isColumn;
            let column2 = restriction.column2;
            
            let value = row[column1];
            let compareValue = isColumn ? row[column2] : column2;

            passed = evaluateExpr(parseComparableValue(value), comparison, parseComparableValue(compareValue));
            if (isAnd && !passed) {
                break;
            } else if (!isAnd && passed) {
                break;
            }
        }

        if (passed) {
            file2Words.push(row);
        }
    }

    return file2Words;
}

/**
 * Evaluates an expression based on the given comparison operator and returns a boolean value.
 *
 * @param {any} value - The value to be evaluated.
 * @param {string} comparison - The comparison operator to be used. Possible values are '===', '!==', '>', '<', '>=', '<=', 'contains', 'not_contains', 'starts_with', 'contains_character', 'starts_with_character'.
 * @param {any} compareValue - The value to compare against.
 * @returns {boolean} - The result of the evaluation.
 */
function evaluateExpr(value, comparison, compareValue) {
    if (value === undefined || value === '' || value === null) {
        return false;
    }

    let passed = false;
    if (comparison === '===') {
        passed = value == compareValue;
    } else if (comparison === '!==') {
        passed = value != compareValue;
    } else if (comparison === '>') {
        passed = value > compareValue;
    } else if (comparison === '<') {
        passed = value < compareValue;
    } else if (comparison === '>=') {
        passed = value >= compareValue;
    } else if (comparison === '<=') {
        passed = value <= compareValue;
    } else if (comparison === 'contains') {
        passed = value.includes(compareValue);
    } else if (comparison === 'not_contains') {
        passed = !value.includes(compareValue);
    } else if (comparison === 'starts_with') {
        passed = value.substring(0, compareValue.length) === compareValue;
    } else if (comparison === 'contains_character') {
        for (let i = 0; i < compareValue.length; i++) {
            if (value.includes(compareValue[i])) {
                passed = true;
                break;
            }
        }
    } else if (comparison === 'starts_with_character') {
        for (let i = 0; i < compareValue.length; i++) {
            if (value.substring(0, compareValue[i].length) === compareValue[i]) {
                passed = true;
                break;
            }
        }
    }

    return passed;
}

/**
 * Combines two arrays of objects based on a selected index word.
 * @param {Array} file1Words - The first array of objects.
 * @param {Array} file2Words - The second array of objects.
 * @returns {Array} - The combined array of objects.
 */
function combineArrays(file1Words, file2Words) {
    let processedWords = [];
    let tempFile1Words = JSON.parse(JSON.stringify(file1Words));
    let tempFile2Words = JSON.parse(JSON.stringify(file2Words));

    let file1IndexWord = workerData.file1IndexWord;
    let file2IndexWord = workerData.file2IndexWord;

    let combined = [];
    let progress = getProgressBarValue();
    
    let oldProgress = progress;
    for (let i = 0; i < tempFile1Words.length; i++) {
        progress = oldProgress + ((i / tempFile1Words.length) * 30);
        setProgressBarValue(progress);

        let word = tempFile1Words[i][file1IndexWord];
        if (processedWords.includes(word)) {
            continue;
        }

        if (word === undefined || word === '' || word === null) {
            continue;
        }
        processedWords.push(word);
        
        for (let j = 0; j < tempFile2Words.length; j++) {
            if (tempFile2Words[j][file2IndexWord] === undefined || tempFile2Words[j][file2IndexWord] === '' || tempFile2Words[j][file2IndexWord] === null) {
                continue;
            }

            if (word === tempFile2Words[j][file2IndexWord]) {
                let obj1 = JSON.parse(JSON.stringify(tempFile1Words[i]));
                let obj2 = JSON.parse(JSON.stringify(tempFile2Words[j]));
                combined.push([obj1, obj2]);
                break;
            }
        }
    }

    return combined;
}

/**
     * Parses a comparable value.
     * 
     * @param {string} val - The value to be parsed.
     * @returns {number|string} - The parsed value.
     */
function parseComparableValue(val) {
    let input = val.replace(',', '.');
    if (/^-?\d+$/.test(input)) {
        return parseInt(input, 10);
    } else if (!isNaN(parseFloat(input))) {
        return parseFloat(input);
    } else {
        return input;
    }
}

/**
     * Checks if a specific column is selected for a given file.
     *
     * @param {string} file - The file name.
     * @param {number} index - The column index.
     * @returns {boolean} - Returns true if the column is selected, false otherwise.
     */
function isColumnSelected(file, index) {
    return workerData.selectionMatrix[file - 1][index];
}


function getProgressBarValue() {
    return workerData.progressBarValue;
}

function setProgressBarValue(value) {
    workerData.progressBarValue = value;
    workerSelf.postMessage({ 
        action: 'setProgressBarValue',
        value: value
    });
}

function generateTable(result) {
    let resultHtml = '<table class="table table-bordered table-striped mx-4 my-4"><thead><tr>';
    let file1Columns = workerData.file1Contents[0];
    let file2Columns = workerData.file2Contents[0];

    console.log(file1Columns);
    console.log(file2Columns);

    let progress = getProgressBarValue();
    let oldProgress = progress;

    for (let i = 0; i < file1Columns.length; i++) {
        progress = oldProgress + ((i / file1Columns.length) * 5);
        setProgressBarValue(progress);
        
        if (!isColumnSelected(1, i)) {
            continue;
        }
        resultHtml += '<th>' + file1Columns[i] + '</th>';
    }
    for (let i = 0; i < file2Columns.length; i++) {
        progress = oldProgress + ((i / file2Columns.length) * 5);
        setProgressBarValue(progress);

        if (!isColumnSelected(2, i)) {
            continue;
        }
        resultHtml += '<th>' + file2Columns[i] + '</th>';
    }
    resultHtml += '</tr></thead><tbody>';

    for (let i = 1; i < result.length; i++) {
        progress = oldProgress + ((i / result.length) * 20);
        setProgressBarValue(progress);

        let row = result[i];
        let tempHtml = '<tr>';
        let allEmpty = true;
        for (let j = 0; j < row.length; j++) {
            let columns = row[j];
            for (let k = 0; k < columns.length; k++) {
                if (!isColumnSelected(j + 1, k)) {
                    continue;
                }

                if (allEmpty && columns[k] !== undefined && columns[k] !== '') {
                    allEmpty = false;
                }
                tempHtml += '<td>' + columns[k] + '</td>';
            }
        }
        tempHtml += '</tr>';

        if (!allEmpty) {
            resultHtml += tempHtml;
        }
    }

    resultHtml += '</tbody></table>';

    setProgressBarValue(100);   
    workerSelf.postMessage({
        action: 'resultTable',
        results: resultHtml,
        type: workerData.forResultType
    });
}

/**
     * Generates a CSV blob containing the results based on selected columns from two files.
     * 
     * @returns {string} The generated CSV blob.
     */
function generateResultBlob(result) {
    let resultCsv = '';
    let delimiter = workerData.csvDelimiter1;
    let file1Columns = workerData.file1Contents[0];
    let file2Columns = workerData.file2Contents[0];

    let progress = getProgressBarValue();
    let oldProgress = progress;

    for (let i = 0; i < file1Columns.length; i++) {
        progress = oldProgress + ((i / file1Columns.length) * 5);
        setProgressBarValue(progress);
        if (!isColumnSelected(1, i)) {
            continue;
        }
        resultCsv += file1Columns[i].replace('\r', '') + delimiter;
    }
    for (let i = 0; i < file2Columns.length; i++) {
        progress = oldProgress + ((i / file2Columns.length) * 5);
        setProgressBarValue(progress);
        if (!isColumnSelected(2, i)) {
            continue;
        }
        resultCsv += file2Columns[i].replace('\r', '') + delimiter;
    }

    resultCsv += '\n';
    for (let i = 1; i < result.length; i++) {
        let row = result[i];
        let tempCsv = '';
        let allEmpty = true;
        for (let j = 0; j < row.length; j++) {
            progress = oldProgress + ((i / result.length) * 20);
            setProgressBarValue(progress);

            let columns = row[j];
            for (let k = 0; k < columns.length; k++) {
                if (!isColumnSelected(j + 1, k)) {
                    continue;
                }

                if (allEmpty && columns[k] !== undefined && columns[k] !== '') {
                    allEmpty = false;
                }
                tempCsv += columns[k].replace('\r', '') + delimiter;
            }
        }
        
        if (!allEmpty) {
            tempCsv += '\n';
            resultCsv += tempCsv;
        }
    }

    setProgressBarValue(100);
    workerSelf.postMessage({
        action: 'resultBlob',
        results: resultCsv,
        type: workerData.forResultType
    });
}