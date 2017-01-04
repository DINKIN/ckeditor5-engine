/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/model/range
 */

import Position from './position';
import TreeWalker from './treewalker';
import CKEditorError from 'ckeditor5-utils/src/ckeditorerror';

/**
 * Range class. Range is iterable.
 */
export default class Range {
	/**
	 * Creates a range spanning from `start` position to `end` position.
	 *
	 * **Note:** Constructor creates it's own {@link module:engine/model/position~Position Position} instances basing on passed values.
	 *
	 * @param {module:engine/model/position~Position} start Start position.
	 * @param {module:engine/model/position~Position} [end] End position. If not set, range will be collapsed at `start` position.
	 */
	constructor( start, end = null ) {
		/**
		 * Start position.
		 *
		 * @readonly
		 * @member {module:engine/model/position~Position}
		 */
		this.start = Position.createFromPosition( start );

		/**
		 * End position.
		 *
		 * @readonly
		 * @member {module:engine/model/position~Position}
		 */
		this.end = end ? Position.createFromPosition( end ) : Position.createFromPosition( start );
	}

	/**
	 * Returns an iterator that iterates over all {@link module:engine/model/item~Item items} that are in this range and returns
	 * them together with additional information like length or {@link module:engine/model/position~Position positions},
	 * grouped as {@link module:engine/model/treewalker~TreeWalkerValue}.
	 * It iterates over all {@link module:engine/model/textproxy~TextProxy text contents} that are inside the range
	 * and all the {@link module:engine/model/element~Element}s that are entered into when iterating over this range.
	 *
	 * This iterator uses {@link module:engine/model/treewalker~TreeWalker} with `boundaries` set to this range
	 * and `ignoreElementEnd` option set to `true`.
	 *
	 * @returns {Iterable.<module:engine/model/treewalker~TreeWalkerValue>}
	 */
	*[ Symbol.iterator ]() {
		yield* new TreeWalker( { boundaries: this, ignoreElementEnd: true } );
	}

	/**
	 * Returns whether the range is collapsed, that is if {@link #start start} and
	 * {@link #end end} positions are equal.
	 *
	 * @type {Boolean}
	 */
	get isCollapsed() {
		return this.start.isEqual( this.end );
	}

	/**
	 * Returns whether this range is flat, that is if {@link #start start} position and
	 * {@link #end end} position are in the same {@link module:engine/model/position~Position#parent parent}.
	 *
	 * @type {Boolean}
	 */
	get isFlat() {
		return this.start.parent === this.end.parent;
	}

	/**
	 * Returns whether this range has no nodes in it, that is if {@link #start start} position and
	 * {@link #end end} position are {@link module:engine/model/position~Position#isTouching touching}.
	 *
	 * **Note:** A range may be empty, but not {@link #isCollapsed collapsed}.
	 *
	 * @type {Boolean}
	 */
	get isEmpty() {
		return this.start.isTouching( this.end );
	}

	/**
	 * Range root element.
	 *
	 * @type {module:engine/model/element~Element|module:engine/model/documentfragment~DocumentFragment}
	 */
	get root() {
		return this.start.root;
	}

	/**
	 * Checks whether this range contains given {@link module:engine/model/position~Position position}.
	 *
	 * @param {module:engine/model/position~Position} position Position to check.
	 * @returns {Boolean} `true` if given {@link module:engine/model/position~Position position} is contained in this range, `false` otherwise.
	 */
	containsPosition( position ) {
		return position.isAfter( this.start ) && position.isBefore( this.end );
	}

	/**
	 * Checks whether this range contains given {@link ~Range range}.
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to check.
	 * @returns {Boolean} `true` if given {@link ~Range range} boundaries are contained by this range, `false` otherwise.
	 */
	containsRange( otherRange ) {
		return this.containsPosition( otherRange.start ) && this.containsPosition( otherRange.end );
	}

	/**
	 * Two ranges are equal if their {@link #start start} and
	 * {@link #end end} positions are equal.
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to compare with.
	 * @returns {Boolean} `true` if ranges are equal, `false` otherwise.
	 */
	isEqual( otherRange ) {
		return this.start.isEqual( otherRange.start ) && this.end.isEqual( otherRange.end );
	}

	/**
	 * Checks and returns whether this range intersects with given range.
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to compare with.
	 * @returns {Boolean} `true` if ranges intersect, `false` otherwise.
	 */
	isIntersecting( otherRange ) {
		return this.start.isBefore( otherRange.end ) && this.end.isAfter( otherRange.start );
	}

	/**
	 * Computes which part(s) of this {@link ~Range range} is not a part of given {@link ~Range range}.
	 * Returned array contains zero, one or two {@link ~Range ranges}.
	 *
	 * Examples:
	 *
	 *		let range = new Range( new Position( root, [ 2, 7 ] ), new Position( root, [ 4, 0, 1 ] ) );
	 *		let otherRange = new Range( new Position( root, [ 1 ] ), new Position( root, [ 5 ] ) );
	 *		let transformed = range.getDifference( otherRange );
	 *		// transformed array has no ranges because `otherRange` contains `range`
	 *
	 *		otherRange = new Range( new Position( root, [ 1 ] ), new Position( root, [ 3 ] ) );
	 *		transformed = range.getDifference( otherRange );
	 *		// transformed array has one range: from [ 3 ] to [ 4, 0, 1 ]
	 *
	 *		otherRange = new Range( new Position( root, [ 3 ] ), new Position( root, [ 4 ] ) );
	 *		transformed = range.getDifference( otherRange );
	 *		// transformed array has two ranges: from [ 2, 7 ] to [ 3 ] and from [ 4 ] to [ 4, 0, 1 ]
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to differentiate against.
	 * @returns {Array.<module:engine/model/range~Range>} The difference between ranges.
	 */
	getDifference( otherRange ) {
		const ranges = [];

		if ( this.isIntersecting( otherRange ) ) {
			// Ranges intersect.

			if ( this.containsPosition( otherRange.start ) ) {
				// Given range start is inside this range. This means that we have to
				// add shrunken range - from the start to the middle of this range.
				ranges.push( new Range( this.start, otherRange.start ) );
			}

			if ( this.containsPosition( otherRange.end ) ) {
				// Given range end is inside this range. This means that we have to
				// add shrunken range - from the middle of this range to the end.
				ranges.push( new Range( otherRange.end, this.end ) );
			}
		} else {
			// Ranges do not intersect, return the original range.
			ranges.push( Range.createFromRange( this ) );
		}

		return ranges;
	}

	/**
	 * Returns an intersection of this {@link ~Range range} and given {@link ~Range range}.
	 * Intersection is a common part of both of those ranges. If ranges has no common part, returns `null`.
	 *
	 * Examples:
	 *
	 *		let range = new Range( new Position( root, [ 2, 7 ] ), new Position( root, [ 4, 0, 1 ] ) );
	 *		let otherRange = new Range( new Position( root, [ 1 ] ), new Position( root, [ 2 ] ) );
	 *		let transformed = range.getIntersection( otherRange ); // null - ranges have no common part
	 *
	 *		otherRange = new Range( new Position( root, [ 3 ] ), new Position( root, [ 5 ] ) );
	 *		transformed = range.getIntersection( otherRange ); // range from [ 3 ] to [ 4, 0, 1 ]
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to check for intersection.
	 * @returns {module:engine/model/range~Range|null} A common part of given ranges or `null` if ranges have no common part.
	 */
	getIntersection( otherRange ) {
		if ( this.isIntersecting( otherRange ) ) {
			// Ranges intersect, so a common range will be returned.
			// At most, it will be same as this range.
			let commonRangeStart = this.start;
			let commonRangeEnd = this.end;

			if ( this.containsPosition( otherRange.start ) ) {
				// Given range start is inside this range. This means thaNt we have to
				// shrink common range to the given range start.
				commonRangeStart = otherRange.start;
			}

			if ( this.containsPosition( otherRange.end ) ) {
				// Given range end is inside this range. This means that we have to
				// shrink common range to the given range end.
				commonRangeEnd = otherRange.end;
			}

			return new Range( commonRangeStart, commonRangeEnd );
		}

		// Ranges do not intersect, so they do not have common part.
		return null;
	}

	/**
	 * Computes and returns the smallest set of {@link #isFlat flat} ranges, that covers this range in whole.
	 *
	 * See an example of a model structure (`[` and `]` are range boundaries):
	 *
	 *		root                                                            root
	 *		 |- element DIV                         DIV             P2              P3             DIV
	 *		 |   |- element H                   H        P1        f o o           b a r       H         P4
	 *		 |   |   |- "fir[st"             fir[st     lorem                               se]cond     ipsum
	 *		 |   |- element P1
	 *		 |   |   |- "lorem"                                              ||
	 *		 |- element P2                                                   ||
	 *		 |   |- "foo"                                                    VV
	 *		 |- element P3
	 *		 |   |- "bar"                                                   root
	 *		 |- element DIV                         DIV             [P2             P3]             DIV
	 *		 |   |- element H                   H       [P1]       f o o           b a r        H         P4
	 *		 |   |   |- "se]cond"            fir[st]    lorem                               [se]cond     ipsum
	 *		 |   |- element P4
	 *		 |   |   |- "ipsum"
	 *
	 * As it can be seen, letters contained in the range are: `stloremfoobarse`, spread across different parents.
	 * We are looking for minimal set of flat ranges that contains the same nodes.
	 *
	 * Minimal flat ranges for above range `( [ 0, 0, 3 ], [ 3, 0, 2 ] )` will be:
	 *
	 *		( [ 0, 0, 3 ], [ 0, 0, 5 ] ) = "st"
	 *		( [ 0, 1 ], [ 0, 2 ] ) = element P1 ("lorem")
	 *		( [ 1 ], [ 3 ] ) = element P2, element P3 ("foobar")
	 *		( [ 3, 0, 0 ], [ 3, 0, 2 ] ) = "se"
	 *
	 * **Note:** if an {@link module:engine/model/element~Element element} is not wholly contained in this range, it won't be returned
	 * in any of the returned flat ranges. See in the example how `H` elements at the beginning and at the end of the range
	 * were omitted. Only their parts that were wholly in the range were returned.
	 *
	 * **Note:** this method is not returning flat ranges that contain no nodes.
	 *
	 * @returns {Array.<module:engine/model/range~Range>} Array of flat ranges covering this range.
	 */
	getMinimalFlatRanges() {
		const ranges = [];
		const diffAt = this.start.getCommonPath( this.end ).length;

		let pos = Position.createFromPosition( this.start );
		let posParent = pos.parent;

		// Go up.
		while ( pos.path.length > diffAt + 1 ) {
			let howMany = posParent.maxOffset - pos.offset;

			if ( howMany !== 0 ) {
				ranges.push( new Range( pos, pos.getShiftedBy( howMany ) ) );
			}

			pos.path = pos.path.slice( 0, -1 );
			pos.offset++;
			posParent = posParent.parent;
		}

		// Go down.
		while ( pos.path.length <= this.end.path.length ) {
			let offset = this.end.path[ pos.path.length - 1 ];
			let howMany = offset - pos.offset;

			if ( howMany !== 0 ) {
				ranges.push( new Range( pos, pos.getShiftedBy( howMany ) ) );
			}

			pos.offset = offset;
			pos.path.push( 0 );
		}

		return ranges;
	}

	/**
	 * Creates a {@link module:engine/model/treewalker~TreeWalker TreeWalker} instance with this range as a boundary.
	 *
	 * @param {Object} options Object with configuration options. See {@link module:engine/model/treewalker~TreeWalker}.
	 * @param {module:engine/model/position~Position} [options.startPosition]
	 * @param {Boolean} [options.singleCharacters=false]
	 * @param {Boolean} [options.shallow=false]
	 * @param {Boolean} [options.ignoreElementEnd=false]
	 */
	getWalker( options = {} ) {
		options.boundaries = this;

		return new TreeWalker( options );
	}

	/**
	 * Returns an iterator that iterates over all {@link module:engine/model/item~Item items} that are in this range and returns
	 * them.
	 *
	 * This method uses {@link module:engine/model/treewalker~TreeWalker} with `boundaries` set to this range and `ignoreElementEnd` option
	 * set to `true`. However it returns only {@link module:engine/model/item~Item model items},
	 * not {@link module:engine/model/treewalker~TreeWalkerValue}.
	 *
	 * You may specify additional options for the tree walker. See {@link module:engine/model/treewalker~TreeWalker} for
	 * a full list of available options.
	 *
	 * @method getItems
	 * @param {Object} options Object with configuration options. See {@link module:engine/model/treewalker~TreeWalker}.
	 * @returns {Iterable.<module:engine/model/item~Item>}
	 */
	*getItems( options = {} ) {
		options.boundaries = this;
		options.ignoreElementEnd = true;

		const treeWalker = new TreeWalker( options );

		for ( let value of treeWalker ) {
			yield value.item;
		}
	}

	/**
	 * Returns an iterator that iterates over all {@link module:engine/model/position~Position positions} that are boundaries or
	 * contained in this range.
	 *
	 * This method uses {@link module:engine/model/treewalker~TreeWalker} with `boundaries` set to this range. However it returns only
	 * {@link module:engine/model/position~Position positions}, not {@link module:engine/model/treewalker~TreeWalkerValue}.
	 *
	 * You may specify additional options for the tree walker. See {@link module:engine/model/treewalker~TreeWalker} for
	 * a full list of available options.
	 *
	 * @param {Object} options Object with configuration options. See {@link module:engine/model/treewalker~TreeWalker}.
	 * @returns {Iterable.<module:engine/model/position~Position>}
	 */
	*getPositions( options = {} ) {
		options.boundaries = this;

		const treeWalker = new TreeWalker( options );

		yield treeWalker.position;

		for ( let value of treeWalker ) {
			yield value.nextPosition;
		}
	}

	/**
	 * Returns a range that is a result of transforming this range by given `delta`.
	 *
	 * **Note:** transformation may break one range into multiple ranges (e.g. when a part of the range is
	 * moved to a different part of document tree). For this reason, an array is returned by this method and it
	 * may contain one or more `Range` instances.
	 *
	 * @param {module:engine/model/delta~Delta} delta Delta to transform range by.
	 * @returns {Array.<module:engine/model/range~Range>} Range which is the result of transformation.
	 */
	getTransformedByDelta( delta ) {
		let ranges = [ Range.createFromRange( this ) ];

		// Operation types that a range can be transformed by.
		const supportedTypes = new Set( [ 'insert', 'move', 'remove', 'reinsert' ] );

		for ( let operation of delta.operations ) {
			if ( supportedTypes.has( operation.type ) ) {
				for ( let i = 0; i < ranges.length; i++ ) {
					const result = ranges[ i ]._getTransformedByDocumentChange(
						operation.type,
						operation.targetPosition || operation.position,
						operation.howMany || operation.nodes.maxOffset,
						operation.sourcePosition
					);

					ranges.splice( i, 1, ...result );

					i += result.length - 1;
				}
			}
		}

		return ranges;
	}

	/**
	 * Returns a range that is a result of transforming this range by multiple `deltas`.
	 *
	 * **Note:** transformation may break one range into multiple ranges (e.g. when a part of the range is
	 * moved to a different part of document tree). For this reason, an array is returned by this method and it
	 * may contain one or more `Range` instances.
	 *
	 * @param {Iterable.<module:engine/model/delta~Delta>} deltas Deltas to transform the range by.
	 * @returns {Array.<module:engine/model/range~Range>} Range which is the result of transformation.
	 */
	getTransformedByDeltas( deltas ) {
		let ranges = [ Range.createFromRange( this ) ];

		for ( let delta of deltas ) {
			for ( let i = 0; i < ranges.length; i++ ) {
				let result = ranges[ i ].getTransformedByDelta( delta );

				ranges.splice( i, 1, ...result );
				i += result.length - 1;
			}
		}

		// It may happen that a range is split into two, and then the part of second "piece" is moved into first
		// "piece". In this case we will have incorrect third rage, which should not be included in the result --
		// because it is already included in first "piece". In this loop we are looking for all such ranges that
		// are inside other ranges and we simply remove them.
		for ( let i = 0; i < ranges.length; i++ ) {
			const range = ranges[ i ];

			for ( let j = i + 1; j < ranges.length; j++ ) {
				const next = ranges[ j ];

				if ( range.containsRange( next ) || next.containsRange( range ) || range.isEqual( next ) ) {
					ranges.splice( j, 1 );
				}
			}
		}

		return ranges;
	}

	/**
	 * Returns a range that is a result of transforming this range by a change in the model document.
	 *
	 * @protected
	 * @param {'insert'|'move'|'remove'|'reinsert'} type Change type.
	 * @param {module:engine/model/position~Position} targetPosition Position before the first changed node.
	 * @param {Number} howMany How many nodes has been changed.
	 * @param {module:engine/model/position~Position} sourcePosition Source position of changes.
	 * @returns {Array.<module:engine/model/range~Range>}
	 */
	_getTransformedByDocumentChange( type, targetPosition, howMany, sourcePosition ) {
		if ( type == 'insert' ) {
			return this._getTransformedByInsertion( targetPosition, howMany, false, false );
		} else {
			return this._getTransformedByMove( sourcePosition, targetPosition, howMany );
		}
	}

	/**
	 * Returns an array containing one or two {@link ~Range ranges} that are a result of transforming this
	 * {@link ~Range range} by inserting `howMany` nodes at `insertPosition`. Two {@link ~Range ranges} are
	 * returned if the insertion was inside this {@link ~Range range} and `spread` is set to `true`.
	 *
	 * Examples:
	 *
	 *		let range = new Range( new Position( root, [ 2, 7 ] ), new Position( root, [ 4, 0, 1 ] ) );
	 *		let transformed = range._getTransformedByInsertion( new Position( root, [ 1 ] ), 2 );
	 *		// transformed array has one range from [ 4, 7 ] to [ 6, 0, 1 ]
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 4, 0, 0 ] ), 4 );
	 *		// transformed array has one range from [ 2, 7 ] to [ 4, 0, 5 ]
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 3, 2 ] ), 4 );
	 *		// transformed array has one range, which is equal to original range
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 3, 2 ] ), 4, true );
	 *		// transformed array has two ranges: from [ 2, 7 ] to [ 3, 2 ] and from [ 3, 6 ] to [ 4, 0, 1 ]
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 4, 0, 1 ] ), 4, false, false );
	 *		// transformed array has one range which is equal to original range because insertion is after the range boundary
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 4, 0, 1 ] ), 4, false, true );
	 *		// transformed array has one range: from [ 2, 7 ] to [ 4, 0, 5 ] because range was expanded
	 *
	 * @protected
	 * @param {module:engine/model/position~Position} insertPosition Position where nodes are inserted.
	 * @param {Number} howMany How many nodes are inserted.
	 * @param {Boolean} [spread] Flag indicating whether this {~Range range} should be spread if insertion
	 * was inside the range. Defaults to `false`.
	 * @param {Boolean} [isSticky] Flag indicating whether insertion should expand a range if it is in a place of
	 * range boundary. Defaults to `false`.
	 * @returns {Array.<module:engine/model/range~Range>} Result of the transformation.
	 */
	_getTransformedByInsertion( insertPosition, howMany, spread = false, isSticky = false ) {
		if ( spread && this.containsPosition( insertPosition ) ) {
			// Range has to be spread. The first part is from original start to the spread point.
			// The other part is from spread point to the original end, but transformed by
			// insertion to reflect insertion changes.

			return [
				new Range( this.start, insertPosition ),
				new Range(
					insertPosition._getTransformedByInsertion( insertPosition, howMany, true ),
					this.end._getTransformedByInsertion( insertPosition, howMany, this.isCollapsed )
				)
			];
		} else {
			const range = Range.createFromRange( this );

			let insertBeforeStart = range.isCollapsed ? true : !isSticky;
			let insertBeforeEnd = range.isCollapsed ? true : isSticky;

			range.start = range.start._getTransformedByInsertion( insertPosition, howMany, insertBeforeStart );
			range.end = range.end._getTransformedByInsertion( insertPosition, howMany, insertBeforeEnd );

			return [ range ];
		}
	}

	/**
	 * Returns an array containing {@link ~Range ranges} that are a result of transforming this
	 * {@link ~Range range} by moving `howMany` nodes from `sourcePosition` to `targetPosition`.
	 *
	 * @protected
	 * @param {module:engine/model/position~Position} sourcePosition Position from which nodes are moved.
	 * @param {module:engine/model/position~Position} targetPosition Position to where nodes are moved.
	 * @param {Number} howMany How many nodes are moved.
	 * @param {Boolean} [spread] Flag indicating whether this {~Range range} should be spread if insertion
	 * was inside the range. Defaults to `false`.
	 * @returns {Array.<module:engine/model/range~Range>} Result of the transformation.
	 */
	_getTransformedByMove( sourcePosition, targetPosition, howMany ) {
		if ( this.isCollapsed ) {
			const newPos = this.start._getTransformedByMove( sourcePosition, targetPosition, howMany, true, true );

			return [ new Range( newPos ) ];
		}

		let result;

		const moveRange = new Range( sourcePosition, sourcePosition.getShiftedBy( howMany ) );

		const differenceSet = this.getDifference( moveRange );
		let difference = null;

		const common = this.getIntersection( moveRange );

		if ( differenceSet.length == 1 ) {
			// `moveRange` and this range intersects.
			difference = new Range(
				differenceSet[ 0 ].start._getTransformedByDeletion( sourcePosition, howMany ),
				differenceSet[ 0 ].end._getTransformedByDeletion( sourcePosition, howMany )
			);
		} else if ( differenceSet.length == 2 ) {
			// `moveRange` is inside this range.
			difference = new Range(
				this.start,
				this.end._getTransformedByDeletion( sourcePosition, howMany )
			);
		} // else, `moveRange` wholly contains this range.

		const insertPosition = targetPosition._getTransformedByDeletion( sourcePosition, howMany );

		if ( difference ) {
			result = difference._getTransformedByInsertion( insertPosition, howMany, common !== null );
		} else {
			result = [];
		}

		if ( common ) {
			result.push( new Range(
				common.start._getCombined( moveRange.start, insertPosition ),
				common.end._getCombined( moveRange.start, insertPosition )
			) );
		}

		return result;
	}

	/**
	 * Creates a new range, spreading from specified {@link module:engine/model/position~Position position} to a position moved by
	 * given `shift`. If `shift` is a negative value, shifted position is treated as the beginning of the range.
	 *
	 * @param {module:engine/model/position~Position} position Beginning of the range.
	 * @param {Number} shift How long the range should be.
	 * @returns {module:engine/model/range~Range}
	 */
	static createFromPositionAndShift( position, shift ) {
		const start = position;
		const end = position.getShiftedBy( shift );

		return shift > 0 ? new this( start, end ) : new this( end, start );
	}

	/**
	 * Creates a range from given parents and offsets.
	 *
	 * @param {module:engine/model/element~Element} startElement Start position parent element.
	 * @param {Number} startOffset Start position offset.
	 * @param {module:engine/model/element~Element} endElement End position parent element.
	 * @param {Number} endOffset End position offset.
	 * @returns {module:engine/model/range~Range}
	 */
	static createFromParentsAndOffsets( startElement, startOffset, endElement, endOffset ) {
		return new this(
			Position.createFromParentAndOffset( startElement, startOffset ),
			Position.createFromParentAndOffset( endElement, endOffset )
		);
	}

	/**
	 * Creates a new instance of `Range` which is equal to passed range.
	 *
	 * @param {module:engine/model/range~Range} range Range to clone.
	 * @returns {module:engine/model/range~Range}
	 */
	static createFromRange( range ) {
		return new this( range.start, range.end );
	}

	/**
	 * Creates a range inside an {@link module:engine/model/element~Element element} which starts before the first child of
	 * that element and ends after the last child of that element.
	 *
	 * @param {module:engine/model/element~Element} element Element which is a parent for the range.
	 * @returns {module:engine/model/range~Range}
	 */
	static createIn( element ) {
		return this.createFromParentsAndOffsets( element, 0, element, element.maxOffset );
	}

	/**
	 * Creates a range that starts before given {@link module:engine/model/item~Item model item} and ends after it.
	 *
	 * @param {module:engine/model/item~Item} item
	 * @returns {module:engine/model/range~Range}
	 */
	static createOn( item ) {
		return this.createFromPositionAndShift( Position.createBefore( item ), item.offsetSize );
	}

	/**
	 * Combines all ranges from the passed array into a one range. At least one range has to be passed.
	 * Passed ranges must not have common parts.
	 *
	 * The first range from the array is a reference range. If other ranges
	 * {@link module:engine/model/position~Position#isTouching are touching} the reference range, they will get combined into one range.
	 *
	 *		[  ][]  [    ][ ][  ref range  ][ ][]  [  ]  // Passed ranges, shown sorted. "Ref range" was the first range in original array.
	 *		        [      returned range       ]  [  ]  // The combined range.
	 *		[    ]                                       // The result of the function if the first range was a reference range.
	 *	            [                           ]        // The result of the function if the third-to-seventh range was a reference range.
	 *	                                           [  ]  // The result of the function if the last range was a reference range.
	 *
	 * @param {Array.<module:engine/model/range~Range>} ranges Ranges to combine.
	 * @returns {module:engine/model/range~Range} Combined range.
	 */
	static createFromRanges( ranges ) {
		if ( ranges.length === 0 ) {
			/**
			 * At least one range has to be passed.
			 *
			 * @error range-create-from-ranges-empty-array
			 */
			throw new CKEditorError( 'range-create-from-ranges-empty-array: At least one range has to be passed.' );
		} else if ( ranges.length == 1 ) {
			return this.createFromRange( ranges[ 0 ] );
		}

		// 1. Set the first range in `ranges` array as a reference range.
		// If we are going to return just a one range, one of the ranges need to be the reference one.
		// Other ranges will be stuck to that range, if possible.
		const ref = ranges[ 0 ];

		// 2. Sort all the ranges so it's easier to process them.
		ranges.sort( ( a, b ) => a.start.isAfter( b.start ) );

		// 3. Check at which index the reference range is now.
		const refIndex = ranges.indexOf( ref );

		// 4. At this moment we don't need the original range.
		// We are going to modify the result and we need to return a new instance of Range.
		// We have to create a copy of the reference range.
		const result = new this( ref.start, ref.end );

		// 5. Ranges before reference range should be glued starting from the "last one", that is the range
		// that is closest to the reference range.
		for ( let i = refIndex - 1; i >= 0; i++ ) {
			if ( ranges[ i ].end.isTouching( result.start ) ) {
				result.start = Position.createFromPosition( ranges[ i ].start );
			} else {
				// If range do not touch with reference range there is no point in looking further.
				break;
			}
		}

		// 5. Ranges after reference range should be glued starting from the "first one", that is the range
		// that is closest to the reference range.
		for ( let i = refIndex + 1; i < ranges.length; i++ ) {
			if ( ranges[ i ].start.isTouching( result.end ) ) {
				result.end = Position.createFromPosition( ranges[ i ].end );
			} else {
				// If range do not touch with reference range there is no point in looking further.
				break;
			}
		}

		return result;
	}

	/**
	 * Creates a `Range` instance from given plain object (i.e. parsed JSON string).
	 *
	 * @param {Object} json Plain object to be converted to `Range`.
	 * @param {module:engine/model/document~Document} doc Document object that will be range owner.
	 * @returns {module:engine/model/element~Element} `Range` instance created using given plain object.
	 */
	static fromJSON( json, doc ) {
		return new this( Position.fromJSON( json.start, doc ), Position.fromJSON( json.end, doc ) );
	}
}
