/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import transformations from 'ckeditor5-engine/src/model/delta/basic-transformations';
/*jshint unused: false*/

import transform from 'ckeditor5-engine/src/model/delta/transform';

import Element from 'ckeditor5-engine/src/model/element';
import Position from 'ckeditor5-engine/src/model/position';
import Range from 'ckeditor5-engine/src/model/range';

import RemoveDelta from 'ckeditor5-engine/src/model/delta/removedelta';
import SplitDelta from 'ckeditor5-engine/src/model/delta/splitdelta';

import MoveOperation from 'ckeditor5-engine/src/model/operation/moveoperation';
import RemoveOperation from 'ckeditor5-engine/src/model/operation/removeoperation';

import { getNodesAndText, jsonParseStringify } from 'ckeditor5-engine/tests/model/_utils/utils';

import {
	applyDelta,
	expectDelta,
	getFilledDocument,
	getMergeDelta,
	getRemoveDelta,
	getSplitDelta
} from 'ckeditor5-engine/tests/model/delta/transform/_utils/utils';

describe( 'transform', () => {
	let doc, root, gy, baseVersion;

	beforeEach( () => {
		doc = getFilledDocument();
		root = doc.getRoot();
		gy = doc.graveyard;
		baseVersion = doc.version;
	} );

	describe( 'RemoveDelta by', () => {
		describe( 'MergeDelta', () => {
			it( 'node on the right side of merge was removed', () => {
				// This special case should be handled by MoveDelta x MergeDelta special case.
				let sourcePosition = new Position( root, [ 3, 3, 3 ] );
				let removeDelta = getRemoveDelta( sourcePosition, 1, baseVersion );

				let mergePosition = new Position( root, [ 3, 3, 3 ] );
				let mergeDelta = getMergeDelta( mergePosition, 4, 12, baseVersion );

				let transformed = transform( removeDelta, mergeDelta );

				expect( transformed.length ).to.equal( 2 );

				baseVersion = mergeDelta.operations.length;

				expectDelta( transformed[ 0 ], {
					type: SplitDelta,
					operations: [
						{
							type: MoveOperation,
							sourcePosition: new Position( gy, [ 0, 0 ] ),
							howMany: 1,
							targetPosition: new Position( root, [ 3, 3, 3 ] ),
							baseVersion: baseVersion
						},
						{
							type: MoveOperation,
							sourcePosition: new Position( root, [ 3, 3, 2, 4 ] ),
							howMany: 12,
							targetPosition: new Position( root, [ 3, 3, 3, 0 ] ),
							baseVersion: baseVersion + 1
						}
					]
				} );

				expectDelta( transformed[ 1 ], {
					type: RemoveDelta,
					operations: [
						{
							type: MoveOperation,
							sourcePosition: removeDelta._moveOperation.sourcePosition,
							howMany: removeDelta._moveOperation.howMany,
							baseVersion: baseVersion + 2
						}
					]
				} );

				// Test if deltas do what they should after applying transformed delta.
				applyDelta( mergeDelta, doc );
				applyDelta( transformed[ 0 ], doc );
				applyDelta( transformed[ 1 ], doc );

				let nodesAndText = getNodesAndText( Range.createFromPositionAndShift( new Position( root, [ 3, 3 ] ), 1 ) );

				// RemoveDelta is applied. MergeDelta is discarded.
				expect( nodesAndText ).to.equal( 'DIVXXXXXabcdXDIV' );
			} );
		} );

		describe( 'SplitDelta', () => {
			it( 'node inside the removed range was a node that has been split', () => {
				let sourcePosition = new Position( root, [ 3, 3, 1 ] );
				let removeDelta = getRemoveDelta( sourcePosition, 3, baseVersion );

				let splitPosition = new Position( root, [ 3, 3, 2, 2 ] );
				let nodeCopy = new Element( 'x' );
				let splitDelta = getSplitDelta( splitPosition, nodeCopy, 2, baseVersion );

				let transformed = transform( removeDelta, splitDelta );

				expect( transformed.length ).to.equal( 1 );

				baseVersion = splitDelta.operations.length;

				expectDelta( transformed[ 0 ], {
					type: RemoveDelta,
					operations: [
						{
							type: RemoveOperation,
							sourcePosition: sourcePosition,
							howMany: 4,
							baseVersion: baseVersion
						}
					]
				} );
			} );

			it( 'last node in the removed range was a node that has been split', () => {
				let sourcePosition = new Position( root, [ 3, 2 ] );
				let removeDelta = getRemoveDelta( sourcePosition, 2, baseVersion );

				let splitPosition = new Position( root, [ 3, 3, 2 ] );
				let nodeCopy = new Element( 'div' );
				let splitDelta = getSplitDelta( splitPosition, nodeCopy, 2, baseVersion );

				let transformed = transform( removeDelta, splitDelta );

				expect( transformed.length ).to.equal( 1 );

				baseVersion = splitDelta.operations.length;

				expectDelta( transformed[ 0 ], {
					type: RemoveDelta,
					operations: [
						{
							type: RemoveOperation,
							sourcePosition: sourcePosition,
							howMany: 3,
							baseVersion: baseVersion
						}
					]
				} );
			} );
		} );
	} );
} );
