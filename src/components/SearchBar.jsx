function SearchBar({ value = "", onChange, placeholder = "Search menu, cuisine, or cravings" }) {
  return (
    <input
      className="search-input"
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

export default SearchBar;
