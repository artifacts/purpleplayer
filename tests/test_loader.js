/*
 Copyright (c) 2010-2011, artifacts Software GmbH & Co. KG
 All rights reserved.
 
 BSD License
 
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of artifacts Software GmbH & Co. KG nor the
 names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.
 
 THIS SOFTWARE IS PROVIDED BY artifacts Software GmbH & Co. KG ''AS IS'' AND ANY
 EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL artifacts Software GmbH & Co. KG BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

module("Loader");
test("init", function() {
    raises(
      function() { new PP.Loader(); },
      "init of loader raises with wrong arguments");

    var config = new PP.Configuration({
        'id':'id_of_my_player_div',
        'dataFile':'fixtures/twoscenes/twoscenes.json'});
    var eventDispatcher = $('div');

    var loader = new PP.Loader(eventDispatcher, config)

    ok(loader);

    stop(1500);

    loader.load(function() {
        ok(loader.jsonData !== null);
        equals(loader.jsonData.childNodes.length, 2);
        equals(loader.progress, 5);
        start();
    });

});

test("onProgress", function() {
    var config = new PP.Configuration({
        'id':'id_of_my_player_div',
        'dataFile':'fixtures/twoscenes/twoscenes.json'});

    var eventDispatcher = $('div');

    var loader = new PP.Loader(eventDispatcher, config)

    var progressedData = {};
    loader.onProgress = function(resourceType, progress) {
        if(! progressedData[resourceType])
            progressedData[resourceType] = 0;
        progressedData[resourceType]++;
    };

    stop(1500);

    loader.load(function() {
        equals(progressedData['image'], 3);
        equals(progressedData['json'], 1);
        equals(progressedData['style'], 1);
        start();
    });
});

test("_findImages", function() {
    var loader = new PP.Loader(null, null);
    var data = {
        'a': [
            1,
            2,
            3,
            [
                4,
                {
                    'imageURL':'/path/a',
                    'test': {
                        'imageURL':'/path/b'
                    },
                },
            ],
        ],
        'b': {
            'imageURL':'/path/c',
            'blubber':[
                { 'imageURL':'/path/d'},
                3
            ]
        },
        'imageURL':'/path/a'
    };

    var images = loader._findImages(data);
    deepEqual(images, ['/path/a', '/path/b', '/path/c', '/path/d']);
});
