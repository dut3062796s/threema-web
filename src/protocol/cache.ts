/**
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

export type CachedChunk = Uint8Array | null;

/**
 * Contains messages that have not yet been acknowledged,
 */
export class ChunkCache {
    private readonly sequenceNumberMax: number;
    private _sequenceNumber = 0;
    private cache: CachedChunk[] = [];

    constructor(sequenceNumberMax: number) {
        this.sequenceNumberMax = sequenceNumberMax;
    }

    /**
     * Get the current sequence number (e.g. of the **next** chunk to be added).
     */
    public get sequenceNumber(): number {
        return this._sequenceNumber;
    }

    /**
     * Get the currently cached chunks.
     */
    public get chunks(): CachedChunk[] {
        return this.cache;
    }

    /**
     * Transfer an array of cached chunks to this cache instance.
     */
    public transfer(cache: CachedChunk[]): void {
        // Add chunks but remove all which are blacklisted
        for (const chunk of cache) {
            if (chunk !== null) {
                this.append(chunk);
            }
        }
    }

    /**
     * Append a chunk to the chunk cache.
     */
    public append(chunk: CachedChunk): void {
        // Check if the sequence number would overflow
        if (this._sequenceNumber >= this.sequenceNumberMax) {
            throw Error('Sequence number overflow');
        }

        // Update sequence number & append chunk
        ++this._sequenceNumber;
        this.cache.push(chunk);
    }

    /**
     * Acknowledge cached chunks and remove those from the cache.
     */
    public acknowledge(theirSequenceNumber: number): void {
        if (theirSequenceNumber < 0 || theirSequenceNumber > this.sequenceNumberMax) {
            throw new Error(`Remote sent us an invalid sequence number: ${theirSequenceNumber}`);
        }

        // Calculate the slice start index for the chunk cache
        // Important: Our sequence number is one chunk ahead!
        const endOffset = theirSequenceNumber + 1 - this._sequenceNumber;
        if (endOffset > 0) {
            throw new Error('Remote travelled through time and acknowledged a chunk which is in the future');
        } else if (-endOffset > this.cache.length) {
            throw new Error('Remote travelled back in time and acknowledged a chunk it has already acknowledged');
        }

        // Slice our cache
        this.cache = endOffset === 0 ? [] : this.cache.slice(endOffset);
    }
}
