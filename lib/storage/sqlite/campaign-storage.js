'use strict';

/**
 * Sqlite backed implementation
 * of CampaignStorage
 * @file campaign-storage.js
 */

/**
 * @callback campaignProcessor
 * @param {Error} err
 * @param {Campaign} obj
 */

var db = require('sqlite');
var Campaign = require('../../objects/campaign');

/** @class */
class CampaignStorage {

  constructor (params) {
    this.dbpath = params.path;
  }

  /**
  * Fetch a Campaign object by id
  *
  * @param {Number} id
  * @param {campaignProcessor} cb
  */
  fetchById (id, cb) {
    db.open(this.dbpath)
      .then((db) => db.prepare(
        'SELECT * FROM candidate_info cn ' +
        'JOIN campaign_info cp ON cp.candidate_id = cn.candidate_id ' +
        'WHERE cp.campaign_id = ?'
      ))
      .then((smt) => smt.get(id))
      .then((row) => Promise.all([
        Promise.resolve(row),
        db.prepare('SELECT * FROM campaign_summary WHERE campaign_id = ?')
        .then((stmt) => stmt.all(id))
      ]))
      .then((campaignParts) => campaignParts.reduce(
        (campaign, summary) => Object.assign(campaign, {campaign_summary: summary})
      ))
      .then((params) => cb(undefined, new Campaign(params)))
      .catch((err) => cb(err));
  }

  /**
   * Fetch all Campaign objects associated with
   * the Candidate of the specified id
   *
   * @param {Number} id
   * @param {campaignProcessor} cb
   */
  fetchByCandidate (id, cb) {
    db.open(this.dbpath)
      .then((db) => db.prepare(
        'SELECT * FROM campaign_info ' +
        'WHERE candidate_id = ?'
      ))
      .then((stmt) => stmt.all(id))
      .then((campaignInfoArray) => Promise.all(campaignInfoArray.map(
        (campaignInfo) => Promise.all([
          Promise.resolve(campaignInfo),
          db.prepare('SELECT * from candidate_info WHERE candidate_id = ?')
          .then((stmt) => stmt.get(campaignInfo.candidate_id)),
          db.prepare('SELECT * FROM campaign_summary WHERE campaign_id = ?')
          .then((stmt) => stmt.all(campaignInfo.campaign_id))
          .then((campaignSummaryArray) => new Object({ campaign_summary: campaignSummaryArray })) // eslint-disable-line no-new-object
        ])
      )))
      .then((campaignPartsArray) => campaignPartsArray.map(
        (campaignParts) => campaignParts.reduce(
          (campaign, part) => Object.assign(campaign, part)
        )
      ))
      .then((campaigns) => cb(undefined, campaigns))
      .catch((err) => cb(err));
  }

  /**
   * Fetch all Campaign objects
   *
   * @param {Number} id
   * @param {campaignProcessor}
   */
  fetchAll (cb) {
    db.open(this.dbpath)
      .then((db) => db.prepare(
        'SELECT * FROM candidate_info cn ' +
        'JOIN campaign_info cp ON cp.candidate_id = cn.candidate_id'
      ))
      .then((stmt) => stmt.all())
      .then((rows) => Promise.all(rows.map((row) => Promise.all([
        Promise.resolve(row),
        db.prepare('SELECT * FROM campaign_summary WHERE campaign_id = ?')
        .then((stmt) => stmt.all(row.campaign_id))
      ]))))
      .then((allCampaignParts) => allCampaignParts.map(
        (campaignParts) => campaignParts.reduce(
          (campaign, summary) => Object.assign(campaign, {campaign_summary: summary})
        )
      ))
      .then((allParams) => allParams.map((params) => new Campaign(params)))
      .then((campaigns) => cb(undefined, campaigns))
      .catch((err) => cb(err));
  }

}

module.exports = CampaignStorage;
