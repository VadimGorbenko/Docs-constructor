function getFile(fileUrl) {
    readXMLFile(event.target.value)
        .then(convertXMLToJSON)
        .then(buildForm)
}

function readXMLFile(fileUrl) {
    return $.ajax({
        url: fileUrl,
        type: "GET",
        dataType: 'xml',
    });
}

function convertXMLToJSON(fileXMLData) {
    console.info('xml-file:', fileXMLData);
    var x2js = new X2JS();
    var fileJSONData = x2js.xml2json(fileXMLData);
    console.info('json-file:', fileJSONData);
    return fileJSONData;
}

function buildForm(fileJSON) {
    var wordDocJson = fileJSON.package.part.filter(function (part) {
        return part["_pkg:name"] === "/word/document.xml"
    });
    var wordDocJsonBody = wordDocJson[0].xmlData.document.body;
    var placeholders = [];
    walker(wordDocJsonBody, null, placeholders);
    console.log(counter);
    console.log(placeholders);

    var placeholdersSdts = [];
    placeholders.forEach(function (prPath) {
        var placeholderSdt = getPlaceholderSdt(wordDocJsonBody, prPath);
        placeholdersSdts = placeholdersSdts.concat(placeholderSdt);
    });

    var wizardForm = $('<form>', {
        class: 'wizard-form',
        method: 'GET',
        action: '?',
        on: {
            change: function (evt) {
                onFormChange(evt)
            },
            submit: onFormSubmit,
        },
        data: {
            docJSON: fileJSON,
            prTags: [],
            sdts: placeholdersSdts,
        },
    });

    placeholdersSdts.forEach(function (prSdt) {
        wizardForm.append(buildPlaceholderInput(prSdt, wizardForm, wordDocJsonBody));
    });

    var wizardSubmitBtn = $('<button>',{
        type: 'submit',
        text: 'Сгенерировать'
    });

    wizardForm.append(wizardSubmitBtn);
    
    $('#app').append(wizardForm);
}

function buildPlaceholderInput(placeholder, form) {
    var prTitle = placeholder.sdtPr.alias['_w:val'];
    var prTagName = placeholder.sdtPr.tag['_w:val'];
    if (form.data().hasOwnProperty('prTags') && form.data().prTags.indexOf(prTagName) === -1) {
        form.data().prTags.push(prTagName);
        var formElem = createFormElement(prTitle, prTagName, placeholder);
        return formElem;
    }
    return null;
}

function createFormElement(title, name, placeholder) {
    var label = $('<label>', {
        text: title
    });

    var input = $('<input>', {
        type: 'text',
        placeholder: title,
        name: name,
        data: {
            sdt: placeholder,
        },
    });

    label.append(input);
    return label;
}

function onFormChange(evt) {
    var inputSdt = $(evt.target).data('sdt');
    if(inputSdt.sdtContent.hasOwnProperty('p')){
        inputSdt.sdtContent.p.r.t.__text = evt.target.value;
    } else{
        inputSdt.sdtContent.r.t.__text = evt.target.value;
    }
}

function onFormSubmit(evt){
    evt.preventDefault();
    var docJSON = $(this).data('docJSON');
    var x2js = new X2JS();
    var docAsXmlStr = x2js.json2xml_str(docJSON);
    // docAsXmlStr += '<?xml version=\1.0\'?><?mso-application progid=\'Word\'?>';
    var blob = new Blob([docAsXmlStr], {type: 'text/html;charset=utf-8'});
    saveAs(blob, 'example.xml');
}

function onWizardInputChange(element, wordDocJsonBody) {
    var tagName = element.name;
    var prPath = $(element).data(pathToSdt);
}

var counter = 0;

function walker(obj, keyPath, store) {
    var keyPath = keyPath || [];
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        var property = keys[i];
        if (obj.hasOwnProperty(property) && property !== 'sdt') {
            if (typeof obj[property] === 'object') {
                if (obj[property].hasOwnProperty('sdt')) {
                    keyPath.push(property);
                    console.log('keyPath:' + keyPath.join('.'));
                    store.push(keyPath.join('.'));
                    console.log(obj[property].sdt);
                    walker(obj[property], keyPath, store);
                    keyPath.pop();
                    counter += Array.isArray(obj[property].sdt) ? obj[property].sdt.length : 1;
                    // continue
                } else {
                    keyPath.push(property);
                    walker(obj[property], keyPath, store);
                    keyPath.pop();
                    continue;
                }
            }
        }
    }
}

function getPlaceholderSdt(treeRoot, pathToSdtString) {
    var placeholder = treeRoot;
    var pathToSdt = pathToSdtString.split('.');
    pathToSdt.forEach(function (pathPoint) {
        placeholder = placeholder[pathPoint];
    });
    return placeholder.sdt;
}