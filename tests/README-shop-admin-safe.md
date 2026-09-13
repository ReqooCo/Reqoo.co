# Shop Admin safe mode

The legacy Shop Admin page is intentionally isolated from the universal Admin shell. Loading the universal shell and multiple enhancement runtimes on the monolithic Shop Admin page caused browser unresponsiveness.

Next architecture: keep this legacy page as the stable fallback, then build Orders, Production, and Products as separate lightweight Admin pages. They may share static CSS and navigation markup, but must not mount competing mutation observers or re-render loops onto the legacy page.