import ezdxf

# Create a new DXF document
doc = ezdxf.new()

# Add new entities to the modelspace
msp = doc.modelspace()

# Add a line
# In a real application, these coordinates would come from the shape detection step
msp.add_line((100, 100), (400, 100))

# Save the DXF document
doc.saveas("output.dxf")

print("DXF file 'output.dxf' created successfully.")
