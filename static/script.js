$(document).ready(function () {
    $('#fileInput1').on('change', handleFileSelect);
    $('#fileInput2').on('change', handleFileSelect);
    $("#generateResultsBtn").on('click', generateResults);

    let file1Loaded = false;
    let file2Loaded = false;
    let restrictionIdNext = 1;

    let file1Contents = [];
    let file2Contents = [];

    function handleFileSelect(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        const fileContentsId = event.target.id;
        reader.fileName = file.name;
        reader.onload = function (e) {
            const contents = e.target;
            onReadFile(contents, fileContentsId);
        };

        reader.readAsText(file);
    }

    function onReadFile(target, fileContentsId) {
        let contents = target.result;
        let fileName = target.fileName;
        let fileNumber = 0;

        if (fileContentsId === 'fileInput1') {
            fileNumber = 1;
            file1Loaded = true;
        } else if (fileContentsId === 'fileInput2') {
            fileNumber = 2;
            file2Loaded = true;
        }

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
            return;
        }
        
        let mappedContents = rows.map(row => row.split(getCsvDelimiter()));
        if (fileNumber === 1) {
            file1Contents = mappedContents;
        } else {
            file2Contents = mappedContents;
        }

        if (rows[0].indexOf(getCsvDelimiter()) === -1) {
            alert('The file ' + fileName + ' does not contain such delimiter. Please select the correct delimiter or change the file.');

            if (fileNumber === 1) {
                file1Loaded = false;
            } else {
                file2Loaded = false;
            }
            return;
        }

        const columns = rows[0].split(getCsvDelimiter());

        const select = $('<select class="form-select" id="select-' + fileNumber + '"></select>');
        const labelSelect = $('<label for="select-' + fileNumber + '">Select word column</label>');
        for (let i = 0; i < columns.length; i++) {
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
    }

    function getCsvDelimiter() {
        if ($('#semicolon').is(':checked')) {
            return ';';
        } else {
            return ',';
        }
    }

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
                <div class ="compare-options">
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

    function generateResults() {
        if (!file1Loaded || !file2Loaded) {
            alert('Please select both files');
            return;
        }
        let result = undefined;

        let file1Words = generateFile1Results();
        let file2Words = generateFile2Results();

        let combined = combineArrays(file1Words, file2Words);

        let resultHtml = '<table class="table table-bordered table-striped mx-4"><thead><tr>';
        let file1Columns = file1Contents[0];
        let file2Columns = file2Contents[0];
        for (let i = 0; i < file1Columns.length; i++) {
            resultHtml += '<th>' + file1Columns[i] + '</th>';
        }
        for (let i = 0; i < file2Columns.length; i++) {
            resultHtml += '<th>' + file2Columns[i] + '</th>';
        }
        resultHtml += '</tr></thead><tbody>';

        for (let i = 1; i < combined.length; i++) {
            let row = combined[i];
            let tempHtml = '<tr>';
            let allEmpty = true;
            for (let j = 0; j < row.length; j++) {
                let columns = row[j];
                for (let k = 0; k < columns.length; k++) {
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
    }

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

    function evaluateExpr(value, comparison, compareValue) {
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
            passed = value.startsWith(compareValue);
        } else if (comparison === 'contains_character') {
            for (let i = 0; i < compareValue.length; i++) {
                if (value.includes(compareValue[i])) {
                    passed = true;
                    break;
                }
            }
        } else if (comparison === 'starts_with_character') {
            for (let i = 0; i < compareValue.length; i++) {
                if (value.startsWith(compareValue[i])) {
                    passed = true;
                    break;
                }
            }
        }

        //console.log("Expression", value, comparison, compareValue, passed, " with value types: ", typeof value, typeof compareValue);

        return passed;
    }

    function combineArrays(file1Words, file2Words) {
        let tempFile1Words = JSON.parse(JSON.stringify(file1Words));
        let tempFile2Words = JSON.parse(JSON.stringify(file2Words));

        let file1IndexWord = $("#select-1").find(":selected").val();
        let file2IndexWord = $("#select-2").find(":selected").val();

        let combined = [];
        for (let i = 0; i < tempFile1Words.length; i++) {
            let word = tempFile1Words[i][file1IndexWord];
            if (word === undefined || word === '' || word === null) {
                continue;
            }

            for (let j = 0; j < tempFile2Words.length; j++) {
                if (tempFile2Words[j][file2IndexWord] === undefined || tempFile2Words[j][file2IndexWord] === '' || tempFile2Words[j][file2IndexWord] === null) {
                    continue;
                }

                if (word === tempFile2Words[j][file2IndexWord]) {
                    let obj1 = JSON.parse(JSON.stringify(tempFile1Words[i]));
                    let obj2 = JSON.parse(JSON.stringify(tempFile2Words[j]));
                    delete obj2[file2IndexWord];
                    combined.push([obj1, obj2]);
                    break;
                }
            }
        }

        return combined;
    }

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
});