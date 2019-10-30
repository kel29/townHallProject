import React from 'react';
import $ from 'jquery';

import urlParamsHandler from '../../../scripts/lib/urlParams';

import {
  makeStateDistrictText
} from '../../../utils';

import TownHall from '../../../scripts/models/TownHall';

import zipLookUpHandler from '../../../scripts/views/zipLookUpView';
import repCardHandler from '../../../scripts/views/repCardView';
import stateView from '../../../scripts/views/stateView';
import tableHandler from '../../../scripts/views/tableView';
import emailHandler from '../../../scripts/views/emailSignUpView';
import resultsView from '../../../scripts/views/resultsView';
import eventHandler from '../../../scripts/views/eventView';
import mapView from '../../../scripts/views/mapView';
import mapboxView from '../../../scripts/views/mapboxView';

const zipcodeRegEx = /^(\d{5}-\d{4}|\d{5}|\d{9})$|^([a-zA-Z]\d[a-zA-Z] \d[a-zA-Z]\d)$/g;

export default class ZipSearch extends React.Component {
  static checkIfOnlySenate(selectedData) {
    var justSenate = true;
    var numOfDistrictEvents = 0;
    if (selectedData.length === 0) {
      justSenate = false;
    }
    selectedData.forEach(function (ele) {
      if (ele.district) {
        numOfDistrictEvents++;
        justSenate = false;
      }
    });
    return [justSenate, numOfDistrictEvents];
  };

  static getLookupArray() {
    if (stateView.state) {
      return ['/zipToDistrict/', '/state_zip_to_district_lower/' + stateView.state + '/', '/state_zip_to_district_upper/' + stateView.state + '/'];
    }
    return ['/zipToDistrict/'];
  }

  constructor(props) {
    super(props);
    this.saveZip = this.saveZip.bind(this);
    this.lookUpZip = this.lookUpZip.bind(this);
    this.state = {
      query: ''
    }
  }

  saveZip(e) {
    this.setState({
      query: e.target.value
    })
  }

  static handleZipToDistrict(zipToDistrictArray) {
    var federal = zipToDistrictArray[0].reduce(function (acc, cur) {
      if (!acc.validDistricts) {
        acc.validDistricts = [];
        acc.validSelections = [];
      }
      var stateObj = eventHandler.getStateDataFromAbbr(cur.abr);
      var geoid = stateObj[0].FIPS + cur.dis;
      acc.thisState = cur.abr;
      acc.validDistricts.push(cur.dis);
      acc.validSelections.push(geoid);
      return acc;
    }, {});

    if (!eventHandler.checkStateName(federal.thisState)) {
      return zipLookUpHandler.zipErrorResponse('That zipcode is not in ' + stateView.state + '. Go back to <a href="/">Town Hall Project U.S.</a> to search for events.');
    }

    if (zipToDistrictArray.length > 1) {
      var lower = zipToDistrictArray[1].reduce(function (acc, cur) {
        if (!acc.validDistricts) {
          acc.validDistricts = [];
        }
        acc.thisState = cur.abr;
        acc.validDistricts.push(cur.dis);
        return acc;
      }, {});
      var upper = zipToDistrictArray[2].reduce(function (acc, cur) {
        if (!acc.validDistricts) {
          acc.validDistricts = [];
        }
        acc.thisState = cur.abr;
        acc.validDistricts.push(cur.dis);
        return acc;
      }, {});
    }
    return {
      federal: federal,
      upper: upper,
      lower: lower,
    };
  }

  lookUpZip(e) {
    e.preventDefault();
    TownHall.resetData();
    TownHall.zipQuery;
    var zip = this.state.query;

    var zipCheck = zip.match(zipcodeRegEx);
    if (zipCheck) {
      var zipClean = zip.split('-')[0];
      repCardHandler.renderRepresentativeCards(TownHall.lookupReps('zip', zipClean), $('#representativeCards section'));
      var lookupArray = ZipSearch.getLookupArray();
      var promises = lookupArray.map(function (path) {
        return TownHall.lookupZip(zipClean, path);
      });
      Promise.all(promises)
        .then(function (zipToDistrictArray) {
          TownHall.zipQuery = zipClean;
          urlParamsHandler.setUrlParameter('district', false);
          urlParamsHandler.setUrlParameter('zipcode', zipClean);

          var locationData = ZipSearch.handleZipToDistrict(zipToDistrictArray);
          eventHandler.renderResults(locationData);
        })
        .catch(function (error) {
          zipLookUpHandler.zipErrorResponse('That zip code is not in our database, if you think this is an error please email us.', error);
        });
    } else {
      zipLookUpHandler.zipErrorResponse('Zip codes are 5 or 9 digits long.');
    }
  };

  render() {
    console.log('mounted')
    return (
      <header className="site-header clearfix">
        <section className="container container-fluid">
          <div className="row">
            <div className="col-md-6 left-panels">
              <div className=" text-left site-header clearfix displayoff ">
                <div className="form-text-results col-md-12">
                  <div className="text-toggle header-large">
                    <img id="header-image" src="/Images/THP_logo_inverse.png" alt=""></img>
                  </div>
                  <div className="text-toggle header-small hidden">
                    {/*<img src="/Images/THP_logo_inverse_simple.png" alt=""></img>*/}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 right-panels">
              <div className="spacer">
              </div>
              <form className="form-inline text-center" onSubmit={this.lookUpZip}>
                <div className="form-group text-center">
                  <input className="form-control input-lg" type="zip" placeholder="Zip Code" onChange={this.saveZip}/>
                  <input type="submit" className="btn btn-primary btn-lg fath-button" value="Find a Town Hall" />
                  <div id="selection-results" className="text-center ">
                    <h4 className="selection-results_content"></h4>
                  </div> 
                </div>
              </form>
              <div id="textresults" className="text-center "></div>
            </div>
          </div>
        </section>
      </header>
    );
  }
};
