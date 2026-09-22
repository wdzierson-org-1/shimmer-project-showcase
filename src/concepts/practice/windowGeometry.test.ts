import { test } from 'node:test';
import assert from 'node:assert/strict';
import { constrainWindow } from './windowGeometry';
test('dragging cannot lose the title bar outside the viewport',()=>{const g=constrainWindow({x:-800,y:3000,width:680,height:460},{width:1440,height:900});assert.deepEqual(g,{x:12,y:428,width:680,height:460});});
test('resizing never exceeds viewport or minimum usable size',()=>{const g=constrainWindow({x:500,y:200,width:2000,height:10},{width:1280,height:800});assert.equal(g.width,1256);assert.equal(g.height,260);assert.equal(g.x,12);assert.equal(g.y,200);});
test('an open desktop window fits after switching to a small screen',()=>{const g=constrainWindow({x:900,y:600,width:680,height:460},{width:375,height:400});assert.deepEqual(g,{x:12,y:12,width:351,height:376});});
