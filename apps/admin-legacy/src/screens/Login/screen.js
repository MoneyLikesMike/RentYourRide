import React, { useState } from "react";
import "./index.scss";
import Button from "../../components/Button";
import {
  emailValidation,
  passwordValidation
} from "../../services/validations";
import useFormValidation from "../../hooks/useFormValidation";

const initialAuthData = {
  email: "",
  password: ""
};

const Login = ({ signIn, errorStatus }) => {
  const [loginPageState, setState] = useState({
    secure: true,
    errorStatus: errorStatus
  });

  const loginAuth = values => {
    return {
      ...passwordValidation(values.password),
      ...emailValidation(values.email)
    };
  };

  const { handleSubmit, handleChange, values, errors } = useFormValidation(
    initialAuthData,
    loginAuth
  );

  const onEnter = e => {
    if (e.key === "Enter" && !errors.length) signIn(values);
  };

  return (
    <div className="login-wrapper">
      <div className="wrapper">
        <span className="caption">Login to continue</span>
        <div className="password-input-wrapper">
          <input
            type="email"
            placeholder="Email Address"
            className={errors.email || errorStatus ? "input invalid" : "input"}
            onChange={event =>
              handleChange({
                name: "email",
                text: event.target.value
              })
            }
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
        <div className="password-input-wrapper">
          <div className="secure">
            <input
              onKeyPress={event => handleSubmit(onEnter, event)}
              type={loginPageState.secure ? "password" : "text"}
              className={
                errors.password || errorStatus ? "input invalid" : "input"
              }
              placeholder="Password"
              onChange={event =>
                handleChange({
                  name: "password",
                  text: event.target.value
                })
              }
            />
            <i
              className={
                loginPageState.secure ? "far fa-eye-slash" : "far fa-eye"
              }
              onClick={() =>
                setState({
                  ...loginPageState,
                  secure: !loginPageState.secure
                })
              }
            />
          </div>
          {errors.password && (
            <span className="error password">{errors.password}</span>
          )}
          {errorStatus && !errors.password && (
            <span className="error">
              {errorStatus === "401"
                ? "Invalid Email or Password!"
                : "User not found!"}
            </span>
          )}
        </div>
        <Button
          title="Log in"
          type="outline"
          color="yellow"
          style={{
            width: "25vw",
            height: "2.2vw",
            fontSize: ".9vw",
            textTransform: "uppercase"
          }}
          onClick={() => handleSubmit(() => signIn(values))}
        />
      </div>
    </div>
  );
};

export default Login;
