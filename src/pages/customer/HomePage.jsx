import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div>
      <Navbar />

      <SearchBar />

      <h3>Categories</h3>
      <Link to="/menu">
  <button>View Menu</button>
</Link>

      <div>
        <button>Appetizers</button>
        <button>Main Course</button>
        <button>Desserts</button>
        <button>Drinks</button>
      </div>
    </div>
  );
}

export default HomePage;