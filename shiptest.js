// *****************************************************************
//  Fedex Shipping API access proof of concept
//
//  This makes use of the FEDEX shipping API to request shipping 
//  quotes for Sun-Mar
//
//  Developer portal: https://developer.ups.com/ or can access from the bottom of normal UPS page
//  creds same as normal:  un:SunMarCorp  pw: 1s4M!J61s4M!J6  (controlled by sun-mar)
//  select the myApps from the top menu Area
//  There are 2 that I created - "Web access canada" and "website UPS acct" - canada and USA
//  This provide access cred management and the list of UPS web services that are enabled
//  the access creds.
//
//  USA account and Creds
//
//  Test account
//  key: l7b193f284be974917978aade15de46e15
//  secret: 3dd2c1f29a2343f484ccf903bb6c4c3e
//  account: 130125136
//
//  Web servie access points that we make use of
//
//  Rating with transit time - for estimates:
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

//inputs - default
dstPc='K0A1X0';
weight='33';
length='91.5';
width='71.1';
height='81.2';


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
var info;
var url;
var i;
var indata;
var creds;

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

//create the payload for the token request
payload=test=new URLSearchParams();
payload.append('grant_type','client_credentials');
payload.append('client_id','17b193f284be974917978aade15de46e15');
payload.append('client_secret','3dd2c1f29a2343f484ccf903bb6c4c3e');

console.log(payload.toString());

//access the API to request an access token, authorization information is the client ID and 
//client secret from the fedex developer portal for Sun-Mar (see above)
resp=await fetch(`https://apis-sandbox.fedex.com/oauth/token`,
    {
    method: 'POST',
    headers: 
	  {
      'Content-Type': 'application/x-www-form-urlencoded',
      },
    body: payload.toString()
    });

data=await resp.json();

console.log(resp);
console.log(data);
return;

//error processing
if(resp.status!=200)
  {
  console.log(" ");
  console.log("Error requesting Authentication:");
  console.log("--------------------------------");
  console.log("Status: ",resp.status," ",resp.statusText);
   
  for(i=0;i<data.response.errors.length;i++)
    {
	console.log("Code: ",data.response.errors[i].code,"  ",data.response.errors[i].message);
    }
  console.log(" ");
  return;
  };

//success processing

//console.log(" ");
//console.log("Authentication result:");
//console.log(JSON.stringify(data))
//console.log("------------------------");

//create URL information for the http request to the rating service
const query=new URLSearchParams(
  {
  additionalinfo: 'timeintransit'
  }).toString();

const version = 'v2403';
const requestoption = 'shop';
url=`https://wwwcie.ups.com/api/rating/${version}/${requestoption}?${query}`;

//access the API for the rating service, this uses the access token generated from the 
//previous API call
resp=await fetch(url,
  {
  method: 'POST',
  headers: 
    {
    'Content-Type': 'application/json',
    transId: '123456',
    transactionSrc: 'testing',
    Authorization: 'Bearer '+data.access_token
    },
  body: JSON.stringify(
    {
    RateRequest: 
	  {
      Request: 
	    {
        TransactionReference: 
		  {
          CustomerContext: 'CustomerContext'
          }
        },
	  CustomerClassification:
	    {
	    Code: '00'
	    },
      Shipment: 
	    {
        Shipper: 
		  {
          Name: 'Sun_mar',
          ShipperNumber: '8X2237',
          Address: 
		    {
            AddressLine: 
			   [
               '5-384 Millen Road'
               ],
            City: 'Stoney Creek',
            StateProvinceCode: 'ON',
            PostalCode: 'L8E2P7',
            CountryCode: 'CA'
            }
          },
        ShipTo: 
		  {
          Name: '',
          Address: 
		    {
            AddressLine: 
			  [
              ''
              ],
            City: '',
            StateProvinceCode: '',
            PostalCode: 'K0A1X0',
            CountryCode: 'CA',
			ResidentialAddressIndicator: '1'
            }
          },
		  
        NumOfPieces: '1',
        Package: 
		  {
          PackagingType: 
		    {
            Code: '02',
            Description: 'Packaging'
            },
          Dimensions: 
		    {
            UnitOfMeasurement: 
			  {
              Code: 'CM',
              Description: 'Centimeters'
              },
            Length: length,
            Width: width,
            Height: height
            },
          PackageWeight: 
		    {
            UnitOfMeasurement: 
			  {
              Code: 'KGS',
              Description: 'Killograms'
              },
            Weight: weight
            }
          },
        ShipmentTotalWeight: 
		  {
          UnitOfMeasurement: 
		    {
            Code: 'KGS',
            Description: 'Killograms'
            },
          Weight: weight
          },		  
        DeliveryTimeInformation: 
		  {
          PackageBillType: '03'
		  },	
		TaxInformationIndicator: '1'  
        }
      }
    })
  });

data2 = await resp.json();

//error from the server
if(resp.status!=200)
  {
  console.log(" ");
  console.log("Error requesting UPS Rates:");
  console.log("---------------------------");
  console.log("Status: ",resp.status," ",resp.statusText);
   
  for(i=0;i<data2.response.errors.length;i++)
    {
	console.log("Code: ",data2.response.errors[i].code,"  ",data2.response.errors[i].message);
    }
  console.log(" ");
  return;
  };
  
//success from the server

//console.log(" ");
//console.log("Shop result:");
//console.log("URL: ",url);
//console.log(JSON.stringify(data2));
//console.log("-------------------");
//console.log(" ");

console.log(" ");
console.log("UPS Rates:");
console.log("---------------------------");
console.log("From Sun-Mar to ",dstPc);
console.log("Weight:",weight,"  Length:",length,"  Width: ",width,"  Height: ",height);
console.log("Price is shown with all taxes included");
for(i=0;i<data2.RateResponse.RatedShipment.length;i++)
  {
  console.log(" ");
  console.log("Service: ",data2.RateResponse.RatedShipment[i].TimeInTransit.ServiceSummary.Service.Description,"",data2.RateResponse.RatedShipment[i].Service.Code," ",data2.RateResponse.RatedShipment[i].TotalChargesWithTaxes.MonetaryValue," Arrive:",data2.RateResponse.RatedShipment[i].TimeInTransit.ServiceSummary.EstimatedArrival.Arrival.Date);

  for(j=0;j<data2.RateResponse.RatedShipment[i].RatedShipmentAlert.length;j++)
    {
	console.log("  Alert: ",data2.RateResponse.RatedShipment[i].RatedShipmentAlert[j].Code,": ",data2.RateResponse.RatedShipment[i].RatedShipmentAlert[j].Description); 
    };
  }
console.log(" ");
}

//run the system
run();
