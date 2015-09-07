#!/usr/bin/env node

/**
 * USAGE:
 *
 * 1. Clone https://github.com/moment/moment-timezone repository
 * 2. Modify its grunt scripts to output isdst (MORE DETAILS TBC)
 * 3. In the moment-timezone root, run `grunt data`
 * 4. Run this script:
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
        offset: null,
        dstChanges: [],
        offsetChanges: []
    };
    // console.log(zone);
    var i, ii, from, offset, prevOffset, isDST, prevWasDST;
    for (i = 1, ii = zone.untils.length; i < ii; i++) {
        from = zone.untils[i - 1];
        offset = -zone.offsets[i]; // Negative to account for reversed values of getTimezoneOffset()
        isDST = zone.dsts[i];
        // if (zone.name == 'America/Cancun') {
        //     console.log(i, from, offset, +isDST, zone.abbrs[i], new Date(from).toUTCString());
        // }
        if ((from >= startDate && from < endDate) || from === null) {
            // Store the base offset if it's not daylight saving
            if (!isDST) {
                zoneData.offset = offset;
            }
            // Add the transition time/direction to lists
            if (isDST !== prevWasDST) {
                zoneData.dstChanges.push([+isDST, from, offset]);
            // Note any changes to the base offset
            } else {
                zoneData.offsetChanges.push([+isDST, from, prevOffset, offset]);
            }
        }
        prevWasDST = isDST;
        prevOffset = offset;
    }
    // Get the offset for a zone that doesn't have any changes this year
    if (zoneData.offset === null) {
        zoneData.offset = -zone.offsets[zone.offsets.length - 1];
    }
    return zoneData;
});
// console.log(dstData.zones);
// console.log(dstData.zones.length);

// Write the output to data file
fs.writeFile('dst-data.json', JSON.stringify(dstData, null, 2));
