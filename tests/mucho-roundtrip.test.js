// Approval test: mucho_001.txt → parseMuchoToNodes → generateMucho → snapshot
// The approved output lives in __snapshots__/mucho-roundtrip.test.js.txt.
// To update: edit that txt file and run: npx vitest run (snapshot picks it up automatically).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseMuchoToNodes, parseMuchoGlobalConfig } from '../js/mucho-parser.js';
import { generateMucho } from '../js/mucho-generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(__dirname, 'fixtures/mucho_001.txt');

describe('MuCho round-trip approval (mucho_001)', () => {
    it('parses the fixture into a non-empty node list', () => {
        const source = readFileSync(FIXTURE, 'utf8');
        const nodes = parseMuchoToNodes(source);

        expect(nodes.length).toBeGreaterThan(0);

        const screenNodes = nodes.filter(n => n.type === 'Screen');
        expect(screenNodes.length).toBeGreaterThan(0);

        // Every screen node must have a title and at least one output
        screenNodes.forEach(n => {
            expect(n.title).toBeTruthy();
            expect(n.outputs.length).toBeGreaterThan(0);
        });
    });

    it('re-exports the parsed nodes and the output matches the approved snapshot', () => {
        const source     = readFileSync(FIXTURE, 'utf8');
        const nodes      = parseMuchoToNodes(source);
        const globalConfig = parseMuchoGlobalConfig(source);

        const exported = generateMucho(nodes, globalConfig);

        expect(exported).toMatchSnapshot();
    });

    it('round-trip is stable: parsing the export produces the same structure', () => {
        const source = readFileSync(FIXTURE, 'utf8');
        const nodes1 = parseMuchoToNodes(source);
        const exported = generateMucho(nodes1);

        const nodes2 = parseMuchoToNodes(exported);

        const screens1 = nodes1.filter(n => n.type === 'Screen');
        const screens2 = nodes2.filter(n => n.type === 'Screen');

        expect(screens2.length).toBe(screens1.length);

        // generateMucho normalises empty lines to "$P"; on re-parse those become
        // literal "$P" tokens in the text.  Normalise both sides before comparing.
        const normText = (t) => t.replace(/^\$P$/gm, '').replace(/\n{2,}/g, '\n').trim();

        screens1.forEach((n1, i) => {
            const n2 = screens2[i];
            expect(n2.title).toBe(n1.title);
            expect(normText(n2.text)).toBe(normText(n1.text));
            expect(n2.outputs.length).toBe(n1.outputs.length);
            n1.outputs.forEach((o1, j) => {
                expect(screens2[i].outputs[j].label).toBe(o1.label);
                expect(screens2[i].outputs[j].flag).toBe(o1.flag);
            });
        });
    });
});
