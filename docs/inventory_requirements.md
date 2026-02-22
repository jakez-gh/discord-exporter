 I believe inventory.md:
should be in every visible folder
should document the current folder with efficient english and greater detail than any parent folder that many have described it.
Could document the "in_scope", "out_scope", "notes" (see below for more clarification on this)
should document every file/folder contained in the current folder.


every file/folder entry in inventory.md should:
have a description that uses clear English to clearly explain why this file/folder needs to exist.
maybe have in_scope section for clarifying the description further
maybe have out_scope section
maybe have notes section as a "junk drawer" for each file/folder


for automation quality gates for inventory:
automatically check the inventory.md exists in every visible folder in a project.
ensure that the inventory.md file has a description for the current folder and that description is of a minimum length to be sufficient for at least the smallest reasonable content.
ensure each file/folder in a folder is represented in the inventory.md
ensure the inventory.md does not have documentation for file/folder that are not in the current folder.
ensure that the desciption for each file/folder in a given inventory.md file is unique and of a length that might be enough to contain a sufficient description.

thoughts:
are in_scope/out_scope/notes needed?
should unique quality gate consider only description or include description+in_scope+out_scope
Is there a way to automate the quality check of the descriptions?
