import React from "react";
import Loader from "react-loader-spinner";
import "./index.scss";

class LoaderSpinner extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    };
  }

  onLoadChange = loading => {
    this.setState({ loading });
  };

  render() {
    const { loading } = this.state;
    return (
      loading && (
        <div className="loader-wrapper">
          <Loader
            type="Rings"
            color="#3aafa9"
            height={250}
            width={250}
          />
        </div>
      )
    );
  }
}

export default LoaderSpinner;
