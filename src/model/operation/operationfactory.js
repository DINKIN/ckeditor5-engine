/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/model/operation/operationfactory
 */

import AttributeOperation from '../operation/attributeoperation.js';
import InsertOperation from '../operation/insertoperation.js';
import MoveOperation from '../operation/moveoperation.js';
import NoOperation from '../operation/nooperation.js';
import Operation from '../operation/operation.js';
import ReinsertOperation from '../operation/reinsertoperation.js';
import RemoveOperation from '../operation/removeoperation.js';
import RenameOperation from '../operation/renameoperation.js';
import RootAttributeOperation from '../operation/rootattributeoperation.js';

const operations = {};
operations[ AttributeOperation.className ] = AttributeOperation;
operations[ InsertOperation.className ] = InsertOperation;
operations[ MoveOperation.className ] = MoveOperation;
operations[ NoOperation.className ] = NoOperation;
operations[ Operation.className ] = Operation;
operations[ ReinsertOperation.className ] = ReinsertOperation;
operations[ RemoveOperation.className ] = RemoveOperation;
operations[ RenameOperation.className ] = RenameOperation;
operations[ RootAttributeOperation.className ] = RootAttributeOperation;

/**
 * A factory class for creating operations.
 *
 * @abstract
 */
export default class OperationFactory {
	/**
	 * Creates concrete `Operation` object from deserilized object, i.e. from parsed JSON string.
	 *
	 * @param {Object} json Deserialized JSON object.
	 * @param {module:engine/model/document~Document} document Document on which this operation will be applied.
	 * @returns {module:engine/model/operation/operation~Operation}
	 */
	static fromJSON( json, document ) {
		return operations[ json.__className ].fromJSON( json, document );
	}
}
