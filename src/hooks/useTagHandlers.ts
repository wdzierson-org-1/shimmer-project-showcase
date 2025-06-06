
export const useTagHandlers = (
  tags: string[],
  setTags: (tags: string[]) => void,
  newTag: string,
  setNewTag: (tag: string) => void
) => {
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return { handleAddTag, handleRemoveTag };
};
