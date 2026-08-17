import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";

const confirm = ({text, confirmButtonText, func}) => {
    Swal.fire({
        title: "Are you sure?",
        text: text || "You want to do  this?",
        icon: "warning",
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonColor: "#4cb6b1",
        cancelButtonColor: "#d33",
        confirmButtonText: confirmButtonText || "Yes"
    }).then(result => {
        if (!!result.value) {
            func()
        }
    });
};

export default {
    confirm
};
