#!/usr/bin/env node

/**
 * USAGE:
 *
 * 1. Clone https://github.com/moment/moment-timezone repository
 * 2. In the moment-timezone root, run `grunt data`
 * 3. Run this script:
 *    `node get-dst-data.js /path/to/moment-timezone/`
 */

var fs = require('fs');
var path = require('path');

// Work out the moment-timezone data directory
var momentTzDir = process.argv[2];
if (!momentTzDir) {
    momentTzDir = '../../../moment/moment-timezone/';
}
momentTzDir = path.resolve(momentTzDir);
var dataDir = path.join(momentTzDir, 'data/unpacked/');
var metaDataDir = path.join(momentTzDir, 'data/meta/');

// Load the data file
var tzFile = fs.readFileSync(path.join(dataDir, 'latest.json'));
var tzData = JSON.parse(tzFile);

// Load the metadata file
var metaFile = fs.readFileSync(path.join(metaDataDir, 'latest.json'));
var metaData = JSON.parse(metaFile);

// Compile list of "useful" (i.e. non-link) zones
var usefulZones = new Set(Object.keys(metaData.zones));

// Compile DST transitions from the start of this year
var dstData = {
    version: tzData.version,
    zones: []
};
var curYear = new Date().getFullYear();
var startDate = Date.UTC(curYear, 0, 1, 0, 0, 0);
var endDate = Date.UTC(curYear + 10, 0, 1, 0, 0, 0);
dstData.zones = tzData.zones.filter(function (zone) {
    return usefulZones.has(zone.name);
}).map(function (zone) {
    var zoneData = {
        id: zone.name,
        offset: -20 * 60,
        dstChanges: []
    };
    // console.log(zone);
    var i, ii, until, offset, prevOffset;
    var allOffsets = [];
    var isDST = false;
    for (i = 0, ii = zone.untils.length; i < ii; i++) {
        // until = zone.untils[i + 1];
        until = zone.untils[i];
        offset = -zone.offsets[i]; // Negative to account for reversed values of getTimezoneOffset()
        // if (zone.name == 'America/Cancun') {
        //     console.log(i, until, offset, zone.abbrs[i]);
        // }
        if ((until >= startDate && until < endDate) || until === null) {
            // If this is the first transition, work out if the zone was already in DST
            if (!allOffsets.length && i > 0) {
                isDST = offset < prevOffset;
            }
            // Add the transition time/direction to lists
            allOffsets.push(offset);
            if (until) {
                zoneData.dstChanges.push([+isDST, until, offset]);
            }
            isDST = !isDST;
        }
        prevOffset = offset;
    }
    // If there's only 1 transition, it indicates a change of zone, not DST
    if (zoneData.dstChanges.length === 1) {
        zoneData.dstChanges[0][0] = 2;
        // zoneData.offset =
    }
    // Work out base offset
    zoneData.offset = Math.min.apply(Math, allOffsets);
    return zoneData;
});
// console.log(dstData.zones);
// console.log(dstData.zones.length);

// Write the output to data file
fs.writeFile('dst-data.json', JSON.stringify(dstData, null, 2));
