# AI Agent Rules - ZX Story Flow

To ensure the integrity of the user's design and the specific constraints of the ZX Spectrum platform, all AI agents must follow these rules:

## Whitespace Preservation
- **NEVER apply `.trim()`** to text strings that are intended for the screen (node descriptions, option labels).
- **Preserve leading spaces**: Users use leading spaces to manually center text on the 32-column screen.
- **Empty vs. Whitespace lines**: 
    - A truly empty line (length 0) should be converted to the `$P` paragraph marker when exporting to MuCho.
    - A line containing only spaces should be preserved as-is, as it may be used for specific vertical spacing or "ghost" content.

## String Processing
- **BASIC Wrapping**: When transpiling MuCho to BASIC, the `wrapText` function (or any replacement) **MUST NOT** use `split(' ')` or any logic that destroys leading whitespace. 
- Leading spaces in paragraphs must be preserved exactly to maintain manual centering.
- Only wrap lines that exceed 32 characters, and do so by finding the last space within the limit, preserving the initial indentation of the paragraph.
