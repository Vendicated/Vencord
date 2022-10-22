export const PluginsGrid: React.CSSProperties = {
    marginTop: 16,
    display: "grid",
    gridGap: 16,
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
};

export const PluginsGridItem: React.CSSProperties = {
    backgroundColor: "var(--background-modifier-selected)",
    color: "var(--interactive-active)",
    borderRadius: 3,
    cursor: "pointer",
    display: "block",
    height: 150,
    padding: 10,
    width: "100%",
};

export const FiltersBar: React.CSSProperties = {
    gap: 10,
    height: 40,
    gridTemplateColumns: "1fr 150px",
    display: "grid"
};
