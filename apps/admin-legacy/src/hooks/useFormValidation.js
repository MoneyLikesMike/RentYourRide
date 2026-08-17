import { useState, useEffect } from "react";

const useFormValidation = (initialState, validate) => {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (isSubmitting) {
      const noErrors = Object.keys(errors).length === 0;
      if (noErrors) {
        setSubmitting(false);
      } else {
        setSubmitting(false);
      }
    }
  }, [errors]);

  const handleChange = ({ name, text }) => {
    setValues({
      ...values,
      [name]: text
    });
  };

  const handleSubmit = (callback, params = {}) => {
    const validationErrors = validate ? validate(values) : {};
    setSubmitting(true);
    setErrors(validationErrors);
    if (callback && Object.keys(validationErrors).length === 0) {
      callback(params);
    }
  };

  const updateState = values => {
    setValues(values);
  };

  return {
    handleSubmit,
    handleChange,
    values,
    errors,
    isSubmitting,
    updateState
  };
};

export default useFormValidation;
