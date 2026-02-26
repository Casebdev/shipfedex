// *****************************************************************
//  Fedex Shipping API access proof of concept
//
//  This makes use of the FEDEX shipping API to request shipping 
//  quotes for Sun-Mar
//
//  Developer portal: https://www.fedex.com/secure-login/en-us/#/credentials 
//  creds same as normal:  un:mark@sun-mar.com  pw: shipAPI1234!  (controlled by m.janoska)
//
//  From the portal can control projects, with associated lists of APIs and
//  create test and production credentials
//
//  Credentials - Project = Sun-Mar Quote
//
//  Sun-Mar account
//  key: l7473e2c67ffef40078c92fe297ab0908c
//  secret: bde4721f137548d9965441ec44088aad
//  account: 175720111
//
//  Test account
//  key: l7b193f284be974917978aade15de46e15
//  secret: 3dd2c1f29a2343f484ccf903bb6c4c3e
//  account: 130125136
//
//
//  Web servie access points that we make use of
//
//  LTL:
//
//  dev:
//  prod: https://apis.fedex.com/rate/v1/freight/rates/quotes
//
//  Rating with transit time - for estimates:
//
//  dev: https://apis-sandbox.fedex.com/rate/v1/rates/quotes
//  prod: https://apis.fedex.com/rate/v1/rates/quotes
//
//  Authentication:
//
//  dev: https://apis-sandbox.fedex.com/oauth/token
//  prod: https://apis.fedex.com/oauth/token
//
//
// *****************************************************************
var readlineSync = require('readline-sync');

//global variables  
var dstPc;
var length;
var width;
var height;
var weight;
var mode;

//inputs - default
srcPc='L8E2P7';
dstPc='K0A1X0';
weight='33';
length='91.5';
width='71.1';
height='81.2';
mode='courier';


// ******************************************************************
//  run()
//
//  Main entry point
//
// ******************************************************************
async function run() 
{
var resp;
var data;
var data2;
var url;
var header;
var payload;
var i;
var indata;

//user input
console.log(" ");
console.log("Enter destination and package information");
console.log("-----------------------------------------");
indata=readlineSync.question('Destination postal code ('+dstPc+'): ').toUpperCase();
if(indata!="") dstPc=indata;

indata=readlineSync.question('Weight [kg] ('+weight+'): ').toUpperCase();
if(indata!="") weight=indata;

indata=readlineSync.question('Length [cm] ('+length+'): ').toUpperCase();
if(indata!="") length=indata;

indata=readlineSync.question('Width [cm] ('+width+'): ').toUpperCase();
if(indata!="") width=indata;

indata=readlineSync.question('Height [cm] ('+height+'): ').toUpperCase();
if(indata!="") height=indata;

indata=readlineSync.question('Mode ('+mode+') [courier,ltl]: ');
if(indata!="") mode=indata;
if(mode!='ltl') mode='courier';


//create the payload for the token request
payload=test=new URLSearchParams();
payload.append('grant_type','client_credentials');
payload.append('client_id','l7473e2c67ffef40078c92fe297ab0908c');
payload.append('client_secret','bde4721f137548d9965441ec44088aad');

//access the API to request an access token,
resp=await fetch(`https://apis.fedex.com/oauth/token`,
    {
    method: 'POST',
	redirect: 'manual',
    headers: 
	  {
      'Content-Type': 'application/x-www-form-urlencoded',
	  //Authorization: 'Basic '+Buffer.from('17b193f284be974917978aade15de46e15:3dd2c1f29a2343f484ccf903bb6c4c3e').toString('base64')
      },
    body: payload.toString()
    });

data=await resp.json();

//console.log(resp);
//console.log(data);
//return;

//error processing
if(resp.status!=200)
  {
  console.log(" ");
  console.log(`Error requesting Authentication (${mode}):`);
  console.log("----------------------------------------------");
  console.log("Status: ",resp.status," ",resp.statusText);
   
  for(i=0;i<data.errors.length;i++)
    {
	console.log("Code: ",data.errors[i].code,"  ",data.errors[i].message);
    }
  console.log(" ");
  return;
  };

//get the quotes
header=
  {
  'Content-Type': 'application/json',
  Authorization: 'Bearer '+data.access_token  
  };
  
info=getPayload(mode,srcPc,dstPc,weight,length,width,height);
//console.log(JSON.stringify(info.payload,null,2));

//access the API for the rating service
resp=await fetch(info.url,
  {
  method: 'POST',
  headers: header,
  body: JSON.stringify(info.payload)
  });

data2 = await resp.json();

//console.log(resp);
//console.log(JSON.stringify(data2,null,2));

//error from the server
if(resp.status!=200)
  {
  console.log(" ");
  console.log(`Error requesting FedEx Rates (${mode}):`);
  console.log("------------------------------------------");
  console.log("Status: ",resp.status," ",resp.statusText);
   
  if(resp.status==401)
    {
	console.log("Error: ",data2.error_description);
	console.log(" ");
    return;
    };
  	  
  for(i=0;i<data2.errors.length;i++)
    {
	console.log("Code: ",data2.errors[i].code,"  ",data2.errors[i].message);
    }
  console.log(" ");
  return;
  };
  
//success from the server
console.log(" ");
console.log(`FexEx Rates (${mode}):`);
console.log("---------------------------");
console.log("From Sun-Mar to ",dstPc);
console.log("Weight:",weight,"  Length:",length,"  Width: ",width,"  Height: ",height);
console.log("Price is shown with all taxes included");
console.log(" ");

container=data2.output.rateReplyDetails;
		  	  
for(i=0;i<container.length;i++)
  {
  console.log("Service: ",container[i].serviceName," ",container[i].ratedShipmentDetails[0].totalNetCharge," Arrive:",container[i].commit.dateDetail.dayFormat.substr(0,10));
  
  //notes related to the estimate
  if(typeof container[i].customerMessages !== "undefined")
    {
	for(j=0;j<container[i].customerMessages.length;j++)
	  {
	  console.log("  Note:",container[i].customerMessages[j].message);
	  };
	console.log(" ");
    };  
  }
console.log(" ");
}


//*********************************************************************
// function getPayload()
// 
// This returns the payload for the specific quote requested
//
//*********************************************************************
function getPayload(mode,spc,dpc,wgt,len,wdt,hgt)
{
var payload;
var url;

payload="";
url="";
	
//LTL quote
if(mode=='ltl')
  {
  url='https://apis.fedex.com/rate/v1/freight/rates/quotes';
  payload=
  {
  "rateRequestControlParameters": {
    "returnTransitTimes": true
  },
  "accountNumber": {
    "value": "175720111"
  },
  "freightRequestedShipment": {
    "serviceType": "FEDEX_FREIGHT_PRIORITY",
    "shipper": {
      "address": {
        "city": "HARRISON",
        "stateOrProvinceCode": "ON",
        "postalCode": spc,
        "countryCode": "CA"
      }
    },
    "recipient": {
      "address": {
        "city": "MIAMI",
        "stateOrProvinceCode": "ON",
        "postalCode": dpc,
        "countryCode": "CA"
      }
    },
//    "shippingChargesPayment": {
//      "paymentType": "SENDER",
//      "payor": {
//        "responsibleParty": {
//          "accountNumber": {
//            "value": "175720111"
//          }
//        }
//      }
//    },
    "freightShipmentDetail": {
      "role": "SHIPPER",
//      "accountNumber": {
//        "value": "175720111"
//      },
      "fedExFreightBillingContactAndAddress": {
        "address": {
          "streetLines": [
            "5-384 Millen Rd"
          ],
          "city": "Stoney Creek",
          "stateOrProvinceCode": "ON",
          "postalCode": spc,
          "countryCode": "CA"
        }
      },
      "lineItem": [
        {
          "freightClass": "CLASS_050",
          "handlingUnits": "1",
          "pieces": 1,
          "subPackagingType": "BUNDLE",
          "id": "ct",
          "weight": {
            "units": "KG",
            "value": wgt
          }
        }
      ]
    },
    "rateRequestType": [
      "LIST"
    ],
    "requestedPackageLineItems": [
      {
        "associatedFreightLineItems": [
          {
            "id": "ct"
          }
        ],
        "weight": {
          "units": "KG",
          "value": wgt
        },
        "subPackagingType": "BUNDLE"
      }
    ]
  }
}
  
  return {payload:payload,url:url};	  
  };
	
//Courier quote

url='https://apis.fedex.com/rate/v1/rates/quotes';
payload=
{
  "accountNumber": {
	"value": "175720111"
  },
  
  "rateRequestControlParameters": {
	"returnTransitTimes": true,
	"servicesNeededOnRateFailure": true,
	"variableOptions": null,
	"rateSortOrder": "SERVICENAMETRADITIONAL"
  },	  
  
  "requestedShipment": {
	"shipper": {
	  "address": {
		"postalCode": spc,
		"countryCode": "CA",
		"residential": false
	  }
	},
	
	"recipient": {
	  "address": {
		"postalCode": dpc,
		"countryCode": "CA",
		"residential": true
	  }
	},
	
	"preferredCurrency": "CAD",
	"pickupType": "CONTACT_FEDEX_TO_SCHEDULE",
	
	"rateRequestType": [
	  "ACCOUNT"
	],
	
	"requestedPackageLineItems": [
	  {
		"weight": {
		  "units": "KG",
		  "value": wgt
		},
		"dimensions": {
		  "length": Math.round(len),
		  "width": Math.round(wdt),
		  "height": Math.round(hgt),
		  "units": "CM"
		}			
	  }
	]
  }
}	 
return {payload:payload,url:url};
}




//run the system
run();
