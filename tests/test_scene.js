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

module("Scene", {
    setup: function() {
        $('#testing-fixtures').empty();
    },

    teardown: function() {
        $('#testing-fixtures').empty();
    },
});

test("basic operations", function() {
    var sceneElement = $("<div id='stage'>").appendTo(
        $("#testing-fixtures"));

    var parentScene = null;
    var sceneData = {
        id: 'rootScene',
        childNodes: [{
            id: 'scene_one',
            transitionToNext: {
                duration: 0,
                transitionType: 0
            },
            childNodes: [{
                id: 'asset_one',
                childNodes: [],
                },{
                id: 'asset_two',
                childNodes: [],
            }],
        }, {
            id: 'scene_two',
            childNodes: [{
                id: 'asset_three',
                childNodes: [],
            }],
        }]
    };

    var rootScene =  PP.SceneBuilder.build(sceneElement, sceneData,
        sceneElement);
    console.log("rootScene", rootScene);

    ok(rootScene);
    ok(rootScene.hasSubScenes());
    equals(rootScene.children.length, 2);
    equals(rootScene.getSubSceneById('scene_two').sceneId, 'scene_two');
});

