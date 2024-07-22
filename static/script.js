$(document).ready(function () {
    $('#fileInput1').on('change', handleFileSelect);
    $('#fileInput2').on('change', handleFileSelect);
    $("#generateResultsBtn").on('click', generateTableResults);
    $("#generateCsvResults").on('click', generateCsvResults);
    $(".delimiter-input").on('change', onFileDelimiterChanged);

    let file1Loaded = false;
    let file2Loaded = false;
    let restrictionIdNext = 1;

    let file1Name = '';
    let file2Name = '';

    let file1Contents = [];
    let file2Contents = [];

    /**
     * Handles the file selection event.
     * 
     * @param {Event} event - The file selection event.
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        const fileContentsId = event.target.id;
        reader.fileName = file.name;
        initProcessingProgressBar();
        reader.onload = function (e) {
            const contents = e.target;
            setProgressBarValue(100);
            onReadFile(contents, fileContentsId);
        };

        setTimeout(() => {
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        }, 500);
    }

    /**
     * Handles the event when a file is read.
     *
     * @param {object} target - The event target object.
     * @param {string} fileContentsId - The ID of the file contents.
     * @returns {void}
     */
    function onReadFile(target, fileContentsId) {
        let contents = target.result;
        let fileName = target.fileName;
        let fileNumber = 0;

        initProcessingProgressBar();

        let isExcel = false;
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            contents = convertExcelToCsv(contents);
            isExcel = true;
        }

        let fileWasAlreadyLoaded = false;
        if (fileContentsId === 'fileInput1') {
            fileNumber = 1;
            fileWasAlreadyLoaded = file1Loaded;
            file1Loaded = true;
            file1Name = fileName;
        } else if (fileContentsId === 'fileInput2') {
            fileNumber = 2;
            fileWasAlreadyLoaded = file2Loaded;
            file2Loaded = true;
            file2Name = fileName;
        }

        if(!isExcel)
            $("#delimiterFile" + fileNumber).show();
        else
            $("#delimiterFile" + fileNumber).hide();

        const parentDiv = $('#file-upload-' + fileNumber);
        const fileContentDiv = parentDiv.find('.file-content');
        if (fileContentDiv.length !== 0)
            fileContentDiv.remove();

        const fileContent = $('<div class="file-content container"></div>');
        const rows = contents.split('\n');

        if (rows.length === 0) {
            alert('The file ' + fileName + ' is empty. Please select another file.');
            if (fileNumber === 1) {
                file1Loaded = false;
            } else {
                file2Loaded = false;
            }

            closeProcessingProgressBar();
            return;
        }
        
        let delimiter = getCsvDelimiter(fileNumber);
        let mappedContents = rows.map(row => row.split(delimiter));
        if (fileNumber === 1) {
            file1Contents = mappedContents;
        } else {
            file2Contents = mappedContents;
        }


        if (fileWasAlreadyLoaded === false && rows[0].indexOf(delimiter) === -1) {
            alert('The file ' + fileName + ' does not contain such delimiter. Please select the correct delimiter or change the file.');

            if (fileNumber === 1) {
                file1Loaded = false;
            } else {
                file2Loaded = false;
            }
            closeProcessingProgressBar();
            
            return;
        }

        initProcessingProgressBar();

        const columns = rows[0].split(delimiter);
        
        let progress = 0;

        const select = $('<select class="form-select word-select" id="select-' + fileNumber + '"></select>');
        const labelSelect = $('<label for="select-' + fileNumber + '">Select word column</label>');
        for (let i = 0; i < columns.length; i++) {
            progress = Math.round((i / columns.length) * 90);
            setProgressBarValue(progress);
            select.append('<option value="' + i + '">' + columns[i] + '</option>');
        }
        
        fileContent.append(labelSelect);
        fileContent.append(select);

        const restrictionsHtml = `<div class="mt-5" style="width: 100%;">
                                    <h5>Restrictions</h5>
                                    <div class="mt-4">
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="condition${fileNumber}" id="and${fileNumber}" value="and${fileNumber}" checked>
                                        <label class="form-check-label" for="and${fileNumber}">AND</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="condition${fileNumber}" id="or${fileNumber}" value="or${fileNumber}">
                                        <label class="form-check-label" for="or${fileNumber}">OR</label>
                                    </div>
                                        <div id="restrictionsList${fileNumber}">
                                            <p id="noRestrictionsMessage${fileNumber}">None</p>
                                        </div>
                                        <button id="addRestrictionBtn${fileNumber}" class="btn btn-primary mt-2">+</button>
                                    </div>`;
        fileContent.append(restrictionsHtml);
        parentDiv.append(fileContent);
        
        $('#addRestrictionBtn' + fileNumber).on('click', addRestriction.bind(null, fileNumber));

        setProgressBarValue(100);

        setTimeout(() => {
            if (file1Loaded && file2Loaded) {
                onBothFilesLoaded();
            }
        }, 100);
    }

    /**
     * Retrieves the CSV delimiter based on the selected checkbox.
     * @returns {string} The CSV delimiter.
     */
    function getCsvDelimiter(fileNumber) {
        if ($('#semicolonFile' + fileNumber).is(':checked')) {
            return ';';
        } else {
            return ',';
        }
    }

    /**
     * Adds a restriction to the specified file number.
     * 
     * @param {number} fileNumber - The file number to add the restriction to.
     */
    function addRestriction(fileNumber) {
        const restrictionId = `restriction-${restrictionIdNext++}`;
        const restrictionHtml = `
            <div id="${restrictionId}" class="condition-group group-${fileNumber}">
                <button class="delete-btn" onclick="removeRestriction('${restrictionId}', ${fileNumber})">x</button>
                <select id="${restrictionId}-select-column1" class="form-select" aria-label="Column Select"></select>
                <select id="${restrictionId}-select-comparison" class="form-select comparison-op" aria-label="Comparison Operator">
                    <option value="===">=</option>
                    <option value="!==">!=</option>
                    <option value=">">></option>
                    <option value="<"><</option>
                    <option value=">=">>=</option>
                    <option value="<="><=</option>  
                    <option value="contains">contains</option>
                    <option value="not_contains">not contains</option>
                    <option value="starts_with">starts with</option>
                    <option value="contains_character">contains any character</option>
                    <option value="starts_with_character">starts with any character</option>
                </select>
                <input type="text" class="form-control compare-value" placeholder="Enter value">
                <select id="${restrictionId}-select-column2" class="form-select" aria-label="Column Select"></select>
                <div class="compare-options">
                    <div class="form-check form-check-inline">
                        <input class="form-check-input compare-type" type="radio" name="compareType${restrictionId}" value="value" checked>
                        <label class="form-check-label">Value</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input compare-type" type="radio" name="compareType${restrictionId}" value="column">
                        <label class="form-check-label">Column</label>
                    </div>
                </div>
            </div>
        `;

        $('#restrictionsList' + fileNumber).append(restrictionHtml);
        $('#noRestrictionsMessage' + fileNumber).hide()
        $('.compare-type').on('change', function () {
            const compareValue = $(this).closest('.condition-group').find('.compare-value');
            const compareColumns = $(this).closest('.condition-group').find('.compare-columns');
            if ($(this).val() === 'column') {
                compareValue.hide();
                compareColumns.show();
            } else {
                compareValue.show();
                compareColumns.hide();
            }
        });
        
        let selecthtml = $('#select-' + fileNumber).html();
        $(`#${restrictionId}-select-column1`).html(selecthtml);
        $(`#${restrictionId}-select-column1`).attr("id", restrictionId+'-select-column1');
        $(`#${restrictionId}-select-column1`).attr("aria-label", "Source value select");

        $(`#${restrictionId}-select-column2`).html(selecthtml);
        $(`#${restrictionId}-select-column2`).attr("id", restrictionId+'-select-column2');
        $(`#${restrictionId}-select-column2`).attr("aria-label", "Other value select");
        $(`#${restrictionId}-select-column2`).addClass("compare-columns");
        $(`#${restrictionId}-select-column2`).hide();

        window.removeRestriction = function (id, fileNumber) {
            $(`#${id}`).remove();
            if ($('.group-' + fileNumber).length === 0) {
                $('#noRestrictionsMessage' + fileNumber).show();
            }
        }
    }

    /**
     * Generates the results by combining the words from two loaded files.
     * 
     * @returns {Array} The combined array of words from both files.
     */
    function generateResults() {
        if (!file1Loaded || !file2Loaded) {
            alert('Please select both files');
            return;
        }

        let file1Words = generateFile1Results();
        let file2Words = generateFile2Results();

        let combined = combineArrays(file1Words, file2Words);

        return combined;
    }

    /**
     * Generates a table of results based on the selected columns from two files.
     * @returns {void}
     */
    function generateTableResults() {
        let result = generateResults();
        let resultHtml = '<table class="table table-bordered table-striped mx-4 my-4"><thead><tr>';
        let file1Columns = file1Contents[0];
        let file2Columns = file2Contents[0];

        for (let i = 0; i < file1Columns.length; i++) {
            if (!isColumnSelected(1, i)) {
                continue;
            }
            resultHtml += '<th>' + file1Columns[i] + '</th>';
        }
        for (let i = 0; i < file2Columns.length; i++) {
            if (!isColumnSelected(2, i)) {
                continue;
            }
            resultHtml += '<th>' + file2Columns[i] + '</th>';
        }
        resultHtml += '</tr></thead><tbody>';

        for (let i = 1; i < result.length; i++) {
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

        $('#results').html(resultHtml);

        closeProcessingProgressBar();
    }

    /**
     * Generates a CSV blob containing the results based on selected columns from two files.
     * 
     * @returns {string} The generated CSV blob.
     */
    function generateResultBlob() {
        initProcessingProgressBar();
        
        let resultCsv = '';
        let delimiter = getCsvDelimiter(1);
        let result = generateResults();
        let file1Columns = file1Contents[0];
        let file2Columns = file2Contents[0];

        let progress = 0;

        for (let i = 0; i < file1Columns.length; i++) {
            progress += Math.round((i / file1Columns.length) * 5) / file1Columns.length;
            setProgressBarValue(progress);
            if (!isColumnSelected(1, i)) {
                continue;
            }
            resultCsv += file1Columns[i].replace('\r', '') + delimiter;
        }
        for (let i = 0; i < file2Columns.length; i++) {
            progress += Math.round((i / file2Columns.length) * 5) / file2Columns.length;
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
                progress += Math.round((j / row.length) * 90) / row.length;
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
        return resultCsv;
    }

    /**
     * Generates a CSV file containing the results.
     * 
     * @returns {void}
     */
    function generateCsvResults() {
        let resultCsv = generateResultBlob();

        let blob = new Blob([resultCsv], { type: 'text/csv' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'results.csv';
        a.click();
    }
    
    /**
     * Retrieves the restrictions based on the given file number.
     * @param {number} fileNumber - The file number to retrieve restrictions for.
     * @returns {Array} An array of restrictions.
     */
    function getRestrictions(fileNumber) {
        let restrictions = [];
        $('.group-' + fileNumber).each(function () {
            const restriction = {};
            restriction.column1 = $(this).find('.form-select').first().find(":selected").val();
            restriction.comparison = $(this).find(`.comparison-op`).val();
            restriction.column2 = $(this).find('.compare-columns').is(':visible') ? $(this).find('.compare-columns').val() : $(this).find('.compare-value').val();
            restriction.isColumn = $(this).find('.compare-type:checked').val() === 'column';
            restrictions.push(restriction);
        });
        return restrictions;
    }

    /**
     * Generates file1 results based on the given restrictions and selected options.
     * @returns {Array} An array of file1 words that pass the restrictions.
     */
    function generateFile1Results() {
        let file1Words = [];
        let isAnd = $('#and1').is(':checked');
        let restrictions1 = getRestrictions(1);

        if (restrictions1.length === 0) {
            return file1Contents;
        }

        for (let i = 1; i < file1Contents.length; i++) {
            let row = file1Contents[i];
            let word = row[$("#select-1").find(":selected").val()];
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
        let isAnd = $('#and2').is(':checked');
        let restrictions2 = getRestrictions(2);

        if (restrictions2.length === 0) {
            return file2Contents;
        }

        for (let i = 1; i < file2Contents.length; i++) {
            let row = file2Contents[i];
            let word = row[$("#select-2").find(":selected").val()];
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

        let file1IndexWord = $("#select-1").find(":selected").val();
        let file2IndexWord = $("#select-2").find(":selected").val();

        let combined = [];
        for (let i = 0; i < tempFile1Words.length; i++) {
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
     * Handles the logic for when both files are loaded.
     */
    function onBothFilesLoaded() {
        initProcessingProgressBar();
        let file1Columns = file1Contents[0];
        let file2Columns = file2Contents[0];

        $('#checkbox-group').show();
        $('#checkbox-group').empty();

        $('#checkbox-group').append('<h2>Choose columns to show</h2>');
        let progress = 0;

        for (let i = 0; i < file1Columns.length; i++) {
            progress = Math.round((i / file1Columns.length) * 50);
            setProgressBarValue(progress);
            let label = file1Columns[i];
            $('#checkbox-group').append(`
                <div class="form-check checkbox-item">
                    <input class="form-check-input" type="checkbox" value="" data-file="1" data-index="${i}" id="1-${label}">
                    <label class="form-check-label checkbox-label" for="1-${label}">
                        ${label}
                    </label>
                </div>
            `);
        }

        let progress2 = 15;
        for (let i = 0; i < file2Columns.length; i++) {
            progress2 = Math.round((i / file2Columns.length) * 50);
            setProgressBarValue(progress + progress2);
            let label = file2Columns[i];
            $('#checkbox-group').append(`
                <div class="form-check checkbox-item">
                    <input class="form-check-input" type="checkbox" value="" data-file="2" data-index="${i}" id="2-${label}">
                    <label class="form-check-label checkbox-label" for="2-${label}">
                        ${label}
                    </label>
                </div>
            `);
        }

        closeProcessingProgressBar();
    }

    /**
     * Checks if a specific column is selected for a given file.
     *
     * @param {string} file - The file name.
     * @param {number} index - The column index.
     * @returns {boolean} - Returns true if the column is selected, false otherwise.
     */
    function isColumnSelected(file, index) {
        return $(`input[data-file="${file}"][data-index="${index}"]`).is(':checked');
    }

    function onFileDelimiterChanged() {
        let fileNumber = parseInt($(this).attr('data-file'));
        let joinedContents = fileNumber === 1 ? file1Contents : file2Contents;
        let delimiter = getCsvDelimiter(fileNumber) === ',' ? ';' : ',' // get the other one cause at this time the selection has changed
        joinedContents = joinedContents.map(row => row.join(delimiter));
        joinedContents = joinedContents.join('\n');

        onReadFile({ result: joinedContents,
             fileName: fileNumber === 1 ? file1Name : file2Name
            }, 'fileInput' + fileNumber);
    }

    function convertExcelToCsv(content) {
        const data = new Uint8Array(content);
        const binaryString = Array.prototype.map.call(data, x => String.fromCharCode(x)).join('');
        const workbook = XLSX.read(binaryString, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvContent = XLSX.utils.sheet_to_csv(firstSheet, { FS: ';' }); // Use semicolon as the delimiter
        return csvContent;
    }

    function initProcessingProgressBar() {
        setTimeout(() => {
            setProgressBarValue(0);
            let modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('fileLoadingModal'));
            modal.show();
        }, 50);
    }

    function closeProcessingProgressBar() {
        setTimeout(() => {
            let modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('fileLoadingModal'));
            modal.hide();
        }, 100);
    }

    function setProgressBarValue(value) {
        setTimeout(() => {
            let progressBar = $('#dialogProcessProgressBar');
            progressBar.attr('aria-valuenow', value);
            progressBar.css('width', value + '%');
            if (value === 100) {
                setTimeout(() => {
                    closeProcessingProgressBar();
                }, 500);
            }
        }, 0);
    }
});