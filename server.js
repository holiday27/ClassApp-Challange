/* API imported
	fast-csv,
	schema-inspector,
	lodash
*/


var fs = require('fs');
var inspector = require('schema-inspector');
// Require `PhoneNumberFormat`. 
var PNF = require('google-libphonenumber').PhoneNumberFormat;
// Get an instance of `PhoneNxumberUtil`. 
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();


var country = 'BR';
var arrayTittle = '';
var listObjectAttribute = '';
var ouputJson = [];
var indexArrayAttribute = 0;
var eidList = [];


// Return array of string values, or NULL if CSV string not well formed.
function CSVtoArray(text) {
    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    // Return NULL if input string is not well formed CSV string.
    if (!re_valid.test(text)) return null;
    var a = [];                     // Initialize array to receive values.
    text.replace(re_value, // "Walk" the string using replace with callback.
        function(m0, m1, m2, m3) {
            // Remove backslash from \' in single quoted values.
            if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
            // Remove backslash from \" in double quoted values.
            else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
            else if (m3 !== undefined) a.push(m3);
            return ''; // Return empty string.
        });
    return a;
};

function readInput(){
	//import File System
	
	var csv = require('fast-csv');
	var stream = fs.createReadStream("input2.csv");	
	var flagTittle = true;

	var csvStream = csv()
	    .on("data", function(data){	    	
	         var arrayAttribute = '';	         
	         for (var i = 0; i < data.length; i++) {
	         	if(flagTittle == true){
	         		//Replace ',' for '/' to keep tag array with ',' 	         		
	         		arrayTittle += data[i]+'/';
	         	}else{
	         		//Replace ',' for '/' to avoid problems with 'sala 5, sala 6'
	         		arrayAttribute += data[i].replace(',','/')+',';
	         	}
	         	
	         }
	         if(flagTittle == false){
	         	listObjectAttribute += arrayAttribute;	         	
	         }	         
	         flagTittle = false;	         
	    })
	    .on("end", function(){
	    	 //console.log('readInput');
	         normalizationCSV();
	    });
	 
	stream.pipe(csvStream);	

	
}

function phoneFormater(number, country){
	// Parse number with country code. 
	//Testing Wrong Tag phone with wrong parameters
	var numberTest = number;
	if(numberTest.replace(/[^0-9]/g,'') == ''){
		return number;
	}
	var phoneNumber = phoneUtil.parse(number, country);
	 
	//replace all caracteres except numbers
	return phoneUtil.format(phoneNumber, PNF.INTERNATIONAL).replace(/[^0-9]/g,'');		
}




function normalizationCSV(){
	//First arrayTittle replace spaces for '/' to conserve TAGS i.e. " phone Responsável, Mãe"
	var aux = arrayTittle.split('/');
	arrayTittle = aux;
	listObjectAttribute = CSVtoArray(listObjectAttribute);

	//Formate ALL data to JSON.stringify
	var dataFormated = [];
	var listID = getID();
	var lastID = '';

	//index to jump to next "row"
	var numberColumns = (arrayTittle.length-1);

	for (var i = 0; i < listID.length; i++) {
		//Check LastID to avoid replicated valeus
		if(i==0){
			lastID = listID[i];
			dataFormated.push(dataValidation(numberColumns*i));
		}

		if(lastID == listID[i]){
			i++;
		}else{
			dataFormated.push(dataValidation(numberColumns*i));
		}

	}

	//write JSON on file output.json
	writeOuputCSV(dataFormated);
}

function writeOuputCSV(data){
	fs.writeFileSync('ouput.json',JSON.stringify(data, null, 2), 'utf8');
	console.log('done');
}

function dataValidation(columnsSize){
	//Get attributes to construct OBJECT

	var name = listObjectAttribute[0+columnsSize];
	var id = listObjectAttribute[1+columnsSize];
	var classesString = getClasses(id);
	var addressArray = getAdreesses(id);
	var invisibleBln = getInvisibleAttribute(id);
	var see_allBln = getSeeAllAttribute(id);

	//Data object represents 
	var data = 
	{
		fullname: '',
		eid: '',
		classes: '',
		addresses: [],
		invisible: '',	
		see_all: ''
	};


	data.fullname = name;
	data.eid = id;
	data.classes = classesString;
	data.addresses = addressArray;
	data.invisible = invisibleBln;
	data.see_all = see_allBln;

	var sanitization = 
	{
		type: "object",
		properties: {
			fullname: { type: "string", rules: ["trim", "title"] },
			eid: { type: "integer" },
			classes: {
				type: "array",
				items: { type: "string", rules: ["trim", "upper"] }
			},

			addresses: {
				type: "array",
				items: {
					type: "object",
					properties: {
						type: {type:"string"},
						tags: {type:"array", 
									 items: { type: "string", rules: ["trim", "upper"]}}
						},
					
						address:  {type:"string"}
				}
			},
			invisible: { type: "boolean" },
			see_all: { type: "boolean" }		
		}
	}


	// Let's update the data
	var inspectorSanitized = inspector.sanitize(sanitization, data);

	var validation = 
{
	type: "object",
	properties: {
		fullname: { type: "string", minLength: 1 },
		eid: { type: "integer", gt: 0, lte: 999999 },
		classes: {
			type: "array",
			items: { type: "string", minLength: 1 }
		},		
		addresses: {
			type: "array",
			items: {
				type: "object",
				properties:{
					type: {type:"string"},
					tags: {type:"array", 
								 items: { type: "string", minLength: 1 }
						  },
					address:  {type:"string"}
				}
			}
		},
		invisible: {type: "boolean" },
		see_all: { type: "boolean" }
	}
}

	var result = inspector.validate(validation, data);			
	if (!result.valid){
		console.log(result.format());
	}
	return inspectorSanitized.data;
}


function getID(){
	var numberColumns = (arrayTittle.length-1);
	var numberRows = listObjectAttribute.length/numberColumns;
	
	var eid =  [];
	for (var i = 0; i < numberRows; i++) {
		eid.push(listObjectAttribute[1+(numberColumns*i)]);
	}

	return eid;
}

function getClasses(eid){
	
	var numberColumns = (arrayTittle.length-1);
	var numberRows = listObjectAttribute.length/numberColumns;
	
	var classes =  '';
	for (var i = 0; i < numberRows; i++) {
		if(listObjectAttribute[1+(numberColumns*i)] == eid){
			
			if(classes == ''){
				classes += listObjectAttribute[2+(numberColumns*i)].replace('/',',');				
				
			}else if(listObjectAttribute[2+(numberColumns*i)]!= ''){
				classes += ','+listObjectAttribute[2+(numberColumns*i)].replace('/',',');
				
			}

			if(classes == ''){
				classes += listObjectAttribute[3+(numberColumns*i)].replace('/',',');				
			}else if(listObjectAttribute[3+(numberColumns*i)] != ''){
				classes += ','+listObjectAttribute[3+(numberColumns*i)].replace('/',',');				
			}


		}
		
	}
	return classes;
}


function getAdreesses(eid){
	//console.log("getAdreesses");
	var numberColumns = (arrayTittle.length-1);
	var numberRows = listObjectAttribute.length/numberColumns;
	
	var addresses =  [];
	for (var i = 0; i < numberRows; i++) {
		if(listObjectAttribute[1+(numberColumns*i)] == eid){
			for (var j = 0; j < 6; j++) {
				//find type, tags and Adress to call setAdressObject
				var address = listObjectAttribute[4+j+(numberColumns*i)];
				var type = getTypeAdress(arrayTittle[4+j]);
				var tags = getTagsAdress(arrayTittle[4+j]);
				var splitAddress = address.split('/');

				if(address != ''){
					//ADD controle for double adress on one filed
					if(splitAddress.length > 1){
						for (var k = 0; k < splitAddress.length; k++) {
							addresses.push(setAdressObject(type, tags, splitAddress[k]));	
						}
					}else{
						addresses.push(setAdressObject(type, tags, address));	
					}
				}
			}
		}
	}
	return addresses;
}

function getTypeAdress(data){
	var type = data.split(' ');
	return type[0];
}

function getTagsAdress(data){
	var splitTags = data.split(' ');
	var tags = '';
	for (var i = 1; i < splitTags.length; i++) {
		tags += splitTags[i];
	}
	return tags;
}

function setAdressObject(type, tags, address){

	//Case address is a phoneNumber need to format de content
	var phoneNumber =  '';
	if(type == 'phone'){
		phoneNumber= phoneFormater(address, 'BR');
		address = phoneNumber;
	}
	var address = {
		type: type,
		tags: tags,
		address: address
	}	
	return address;
}


function getInvisibleAttribute(id){
	//console.log('getInvisibleAttribute');
	var numberColumns = (arrayTittle.length-1);
	var numberRows = listObjectAttribute.length/numberColumns;		
	var invisibleBln =  false;
	for (var i = 0; i < numberRows; i++) {		
		if(listObjectAttribute[1+(numberColumns*i)] == id){
			if(listObjectAttribute[10+(numberColumns*i)] == 1){
				invisibleBln = true;				
			}
		}		
	}	
	return invisibleBln;
}

function getSeeAllAttribute(id){
	//console.log('getSeeAllAttribute')
	var numberColumns = (arrayTittle.length-1);
	var numberRows = listObjectAttribute.length/numberColumns;	
	var seeAllBln =  false;
	for (var i = 0; i < numberRows; i++) {				
		if(listObjectAttribute[1+(numberColumns*i)] == id){
			if(listObjectAttribute[11+(numberColumns*i)] == 'yes'){
				seeAllBln = true;				
			}
		}		
	}	
	return seeAllBln;
}

readInput();


