import React, { useEffect, useState } from "react";
import { updateUserInputs } from "../../utilities/arrays";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import type { UpdaterUserType } from "../../utilities/interfaces";
import EditSection from "./childComponent/EditSection";

export default function UpdateUserInfo() {
  const { user } = useSelector((state: RootState) => state.userSlice);
  const [isEdit, setIsEdit] = useState(false);
  const { isSuccess } = useSelector((state: RootState) => state.loadingSlice);
  const [updateInputValue, setUpdateInputValue] = useState<UpdaterUserType>({
    firstname: "",
    surname: "",
    username: "",
    email: "",
    password: "",
  });
  const dispatch = useDispatch();

  /* function */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdateInputValue((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    setIsEdit(true);
    setUpdateInputValue({
      firstname: user?.userStoraged?.firstname ?? "",
      surname: user?.userStoraged?.surname ?? "",
      username: user?.userStoraged?.username ?? "",
      email: user?.userStoraged?.email ?? "",
      password: "",
    });
  };
  const handleSave = () => {
    const id = user?.userStoraged?.id;
    if (!id) return;

    dispatch({
      type: "Fetch-UPDATE-USER",
      payload: { id: Number(id), data: updateInputValue },
    });
    setIsEdit(false);
  };
  useEffect(() => {
    if (isSuccess) {
      setUpdateInputValue({
        firstname: "",
        surname: "",
        username: "",
        email: "",
        password: "",
      });
    }
  }, [isSuccess]);
  console.log("updateInputValue", updateInputValue);
  console.log("user", user);
  return (
    <div>
      <EditSection
        isEdit={isEdit}
        updateUserInputs={updateUserInputs}
        updateInputValue={updateInputValue}
        handleChange={handleChange}
        handleEdit={handleEdit}
        handleSave={handleSave}
      />
    </div>
  );
}
