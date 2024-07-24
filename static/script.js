$(document).ready(function () {
    if (!window.Worker) {
        alert('Your browser is not supported, the filtering will not work correctly');
    }

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
    let worker = undefined;

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
     * Generates a table of results based on the selected columns from two files.
     * @returns {void}
     */
    function generateTableResults() {
        if (!file1Loaded || !file2Loaded) {
            alert('Please select both files');
            return;
        }

        if (worker) {
            worker.terminate();
            worker = undefined;
        }

        initProcessingProgressBar();
        worker = new Worker('worker.js');
        worker.onmessage = onWorkerMessage;
        worker.postMessage({
            action: 'generateResults',
            data: gatherFileDataForWorker('table')
        });
    }

    function onWorkerMessage(e) {
        if (e.data.action === 'setProgressBarValue') {
            setProgressBarValue(e.data.value);
        }

        else if (e.data.action === 'resultTable') {
            let results = e.data.results;
            showTable(results);
        }

        else if (e.data.action === 'log') {
            console.log(e.data.value);
        }

        else if (e.data.action === 'resultBlob') {
            let blob = new Blob([e.data.results], { type: 'text/csv' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'results.csv';
            a.click();
            closeProcessingProgressBar();
        }
    }

    function gatherFileDataForWorker(forResultType) {
        return {
            file1Contents: file1Contents,
            file2Contents: file2Contents,
            file1Columns: file1Contents[0],
            file2Columns: file2Contents[0],
            restrictions1: getRestrictions(1),
            restrictions2: getRestrictions(2),
            selectionMatrix: getSelectionMatrix(),
            isAnd1: $('#and1').is(':checked'),
            isAnd2: $('#and2').is(':checked'),
            file1IndexWord: $('#select-1').find(":selected").val(),
            file2IndexWord: $('#select-2').find(":selected").val(),
            forResultType: forResultType,
            progressBarValue: getProgressBarValue(),
            csvDelimiter1: getCsvDelimiter(1),
            csvDelimiter2: getCsvDelimiter(2)
        };
    }

    /**
     * Generates a CSV file containing the results.
     * 
     * @returns {void}
     */
    function generateCsvResults() {
        if (!file1Loaded || !file2Loaded) {
            alert('Please select both files');
            return;
        }

        initProcessingProgressBar();
        worker = new Worker('worker.js');
        worker.onmessage = onWorkerMessage;
        worker.postMessage({
            action: 'generateResults',
            data: gatherFileDataForWorker('csv')
        });
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

    function getSelectionMatrix() {
        // create a matrix of boolean values for the selected columns
        let matrix = [];
        let file1Columns = file1Contents[0];
        let file2Columns = file2Contents[0];

        let column = [];
        for (let i = 0; i < file1Columns.length; i++) {
            let selected = $(`input[data-file="1"][data-index="${i}"]`).is(':checked');
            column.push(selected);
        }
        matrix.push(column);

        column = [];
        for (let i = 0; i < file2Columns.length; i++) {
            let selected = $(`input[data-file="2"][data-index="${i}"]`).is(':checked');
            column.push(selected);
        }
        matrix.push(column);

        return matrix;
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

    function setProgressBarValue(val) {
        let value = Math.round(val);
        if (value > 100) {
            value = 100;
        }

        //console.log(value);
        let progressBar = $('#dialogProcessProgressBar');
        progressBar.attr('aria-valuenow', value);
        progressBar.css('width', value + '%');
        if (value >= 100) {
            setTimeout(() => {
                closeProcessingProgressBar();
            }, 500);
        }
    }

    function getProgressBarValue() {
        let progressBar = $('#dialogProcessProgressBar');
        let val = progressBar.css('width');
        val = val.replace('%', '');
        
        if (val === undefined) {
            return 0;
        }

        if (isNaN(val)) {
            return 0;
        }

        return parseInt(val);
    }

    function showTable(resultHtml) {
        $('#results').html(resultHtml);
    }
});