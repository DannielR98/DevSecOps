import React, { useState } from "react";
import { updateUserInputs } from "../../../utilities/arrays";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import type { UpdaterUserType } from "../../../utilities/interfaces";
import EditSection from "./childComponent/EditSection";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

export default function UpdateUserInfo() {
  const { userOne } = useSelector((state: RootState) => state.userSlice);
  const { getAccessTokenSilently } = useAuth();
  const [isEdit, setIsEdit] = useState(false);
  const [updateInputValue, setUpdateInputValue] = useState<UpdaterUserType>({
    firstname: "",
    surname: "",
    username: "",
    email: "",
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
      firstname: userOne?.firstname ?? "",
      surname: userOne?.surname ?? "",
      username: userOne?.username ?? "",
      email: userOne?.email ?? "",
    });
  };
  const handleSave = async () => {
    const id = userOne?.user_id ?? userOne?.id;
    if (!id) {
      toast.error("Användarprofilen är inte laddad.");
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      dispatch({
        type: "Fetch-UPDATE-USER",
        payload: { id, data: updateInputValue, token },
      });
    } catch (error) {
      console.error("Could not retrieve authentication token:", error);
      toast.error("Kunde inte hämta inloggningen. Försök igen.");
      return;
    }
    setIsEdit(false);
    setUpdateInputValue({
      firstname: "",
      surname: "",
      username: "",
      email: "",
    });
  };

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
